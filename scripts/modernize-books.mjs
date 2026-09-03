/*
 * Rewrites the Library's public-domain classics into modern, contemporary
 * English and saves the result alongside the original text, so the reader
 * can offer a "현대식 영어로 읽기" (read in modern English) toggle without
 * any live API calls during the challenge — every participant reads the
 * same pre-generated text, for free and instantly.
 *
 * This does NOT run automatically and does NOT run in the browser: it's a
 * one-time (or per-book) admin step, exactly like build-books.mjs. It
 * calls the Gemini API with YOUR OWN key and writes straight back into
 * public/books/<id>.json as a new `modernParagraphs` array on each
 * chapter, next to the untouched original `paragraphs` — nothing existing
 * is overwritten or removed.
 *
 * Usage:
 *   GEMINI_API_KEY=your-key node scripts/modernize-books.mjs
 *   GEMINI_API_KEY=your-key node scripts/modernize-books.mjs --book wizard-of-oz
 *   GEMINI_API_KEY=your-key node scripts/modernize-books.mjs --dry-run
 *
 * Rewriting all 12 books is a LOT of API calls (each book is chapters
 * worth of a whole novel, sent one reader-page at a time) — expect it to
 * take a while and to use real Gemini quota. It's safe to stop (Ctrl+C)
 * and re-run later: progress is checkpointed per chapter in
 * scripts/.modernize-progress.json, and completed chapters are skipped.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paginateParagraphs, targetWordsForLevel } from '../src/lib/pagination.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.join(HERE, '..', 'public', 'books');
const PROGRESS_FILE = path.join(HERE, '.modernize-progress.json');

const MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const PACE_DELAY_MS = 500; // between successful calls, so we don't hammer the API

const LEVEL_GUIDANCE = {
  Beginner:
    'Use very common, high-frequency words and short, simple sentences — the kind of English a beginner learner meets in everyday conversation. Avoid idioms and complex clause structures.',
  Intermediate:
    'Use natural, everyday-to-moderately-advanced vocabulary and normal-length sentences, the way a contemporary novel for adult readers would read.',
  Advanced:
    'You may use richer, more nuanced vocabulary and varied sentence structure, as long as it still reads as natural, contemporary English rather than 19th-century prose.',
};

const SYSTEM_PROMPT_FOR = (level) => `You help English learners study contemporary English by modernizing classic novels.

The user sends you several consecutive paragraphs from a public-domain 19th- or early-20th-century novel. Rewrite them in modern, natural, contemporary English, as if a present-day author retold this exact scene today — not a light paraphrase with a few words swapped.

Rules:
- Keep the same characters, events, dialogue content, and meaning. Do not add, remove, or invent plot content.
- Replace archaic vocabulary, obsolete verb forms and pronouns (thee/thou/thy, -eth/-est endings, "shall", "whilst", "ere", "hath", etc.), and ornate or convoluted 19th-century sentence structures with clear, natural, everyday modern English.
- This must be a SUBSTANTIAL, thorough rewrite — restructure sentences freely, split or combine them as needed — as long as the meaning and the order of events are preserved. Do not just swap individual words while keeping the original sentence structure.
- ${LEVEL_GUIDANCE[level] || LEVEL_GUIDANCE.Intermediate}
- Preserve paragraph breaks: return exactly one output paragraph for each input paragraph, in the same order, covering the same content.
- Every string must be plain English text. No Korean, no commentary, no notes about your process.
- Return ONLY a JSON object of this exact shape: {"paragraphs": ["rewritten paragraph 1", "rewritten paragraph 2", ...]}. No markdown fences.`;

function parseArgs(argv) {
  const args = { book: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--book') args.book = argv[++i];
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function loadProgress() {
  try {
    return JSON.parse(await readFile(PROGRESS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveProgress(progress) {
  await writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2) + '\n', 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Calls Gemini once for one page's worth of paragraphs; throws on failure. */
async function modernizeBatch(apiKey, paragraphs, level) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT_FOR(level) }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Here are ${paragraphs.length} consecutive paragraphs from the novel:\n\n${paragraphs
              .map((p, i) => `[${i + 1}] """${p}"""`)
              .join('\n\n')}\n\nRewrite them following your instructions exactly.`,
          },
        ],
      },
    ],
    generationConfig: {
      // Higher temperature adds wording variance, which reduces the chance
      // the output matches the original closely enough to trip Gemini's
      // own copyright/recitation filter.
      temperature: 0.9,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const err = new Error(detail?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.retryable = response.status === 429 || response.status >= 500;
    throw err;
  }

  const json = await response.json();
  const candidate = json?.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');

  if (!text) {
    const finishReason = candidate?.finishReason;
    const err = new Error(`Empty response (${finishReason || json?.promptFeedback?.blockReason || 'unknown'})`);
    // RECITATION and MAX_TOKENS are both worth retrying — temperature
    // varies the wording on the next attempt.
    err.retryable = finishReason === 'RECITATION' || finishReason === 'MAX_TOKENS';
    throw err;
  }

  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) {
    throw new Error('Response had no paragraphs array');
  }
  return parsed.paragraphs.map((p) => String(p).trim()).filter(Boolean);
}

async function modernizeBatchWithRetry(apiKey, paragraphs, level) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      process.stdout.write(`      retry ${attempt}/${MAX_RETRIES} in ${delay}ms (${lastErr.message})…\n`);
      await sleep(delay);
    }
    try {
      return await modernizeBatch(apiKey, paragraphs, level);
    } catch (err) {
      lastErr = err;
      if (!err.retryable) throw err;
    }
  }
  throw lastErr;
}

async function modernizeChapter(apiKey, book, chapter, chapterIndex, progress, dryRun) {
  const targetWords = targetWordsForLevel(book.level);
  const pages = paginateParagraphs(chapter.paragraphs, targetWords);
  const bookProgress = (progress[book.id] ||= {});
  let doneCount = bookProgress[chapterIndex] || 0;
  let consumedCount = 0;
  chapter.modernParagraphs = chapter.modernParagraphs || [];

  for (const [pageIndex, page] of pages.entries()) {
    const pageSize = page.paragraphs.length;
    if (consumedCount + pageSize <= doneCount) {
      consumedCount += pageSize;
      continue; // already done in a previous run
    }
    consumedCount += pageSize;

    process.stdout.write(
      `    page ${pageIndex + 1}/${pages.length} (${pageSize} paragraphs, ~${page.wordCount} words)…`
    );
    if (dryRun) {
      process.stdout.write(' [dry-run, skipped]\n');
      continue;
    }
    const rewritten = await modernizeBatchWithRetry(apiKey, page.paragraphs, book.level);
    chapter.modernParagraphs.push(...rewritten);
    bookProgress[chapterIndex] = consumedCount;
    await saveProgress(progress);
    process.stdout.write(` done (${rewritten.length} paragraphs back)\n`);
    await sleep(PACE_DELAY_MS);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !args.dryRun) {
    console.error('Set GEMINI_API_KEY in the environment first (or pass --dry-run to preview without calling the API).');
    process.exit(1);
  }

  const files = (await readdir(BOOKS_DIR)).filter((f) => f.endsWith('.json') && f !== 'index.json');
  const targets = args.book ? files.filter((f) => f === `${args.book}.json`) : files;
  if (targets.length === 0) {
    console.error(args.book ? `No book found with id "${args.book}".` : 'No books found.');
    process.exit(1);
  }

  const progress = await loadProgress();

  for (const file of targets) {
    const filePath = path.join(BOOKS_DIR, file);
    const book = JSON.parse(await readFile(filePath, 'utf8'));
    if (book.bible) {
      console.log(`\n📖 ${book.title} — skipping: World English Bible text is already modern English and should not be AI-paraphrased.`);
      continue;
    }
    if (book.noModernize) {
      console.log(`\n📖 ${book.title} — skipping: each "chapter" here is a short verbatim quotation, not prose to rewrite.`);
      continue;
    }
    console.log(`\n📖 ${book.title} (${book.level}) — ${book.chapters.length} chapters`);

    for (const [chapterIndex, chapter] of book.chapters.entries()) {
      console.log(`  [${chapterIndex + 1}/${book.chapters.length}] ${chapter.title}`);
      await modernizeChapter(apiKey, book, chapter, chapterIndex, progress, args.dryRun);
      if (!args.dryRun) {
        await writeFile(filePath, JSON.stringify(book, null, 2) + '\n', 'utf8');
      }
    }
  }

  console.log(
    args.dryRun
      ? '\nDry run complete — nothing was written.'
      : '\nDone. Modern-English text is saved in public/books/*.json — commit the changes to ship it.'
  );
}

main().catch((err) => {
  console.error('\nFailed:', err);
  process.exit(1);
});
