/*
 * Build the bundled public-domain library.
 *
 * Downloads plain-text/XHTML sources of public-domain books (Project
 * Gutenberg mirrors on GitHub + Standard Ebooks), splits them into
 * chapters, and writes JSON files the app can lazy-load:
 *
 *   public/books/index.json   — manifest (id, title, author, level, …)
 *   public/books/<id>.json    — { ...meta, chapters: [{title, paragraphs}] }
 *
 * Run manually when adding books:  node scripts/build-books.mjs
 * The generated JSON is committed, so users never need to run this.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paginateParagraphs, targetWordsForLevel } from '../src/lib/pagination.js';

const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'books'
);

const BOOKS = [
  {
    id: 'wizard-of-oz',
    title: 'The Wonderful Wizard of Oz',
    author: 'L. Frank Baum',
    year: 1900,
    level: 'Beginner',
    description:
      'Dorothy is swept away by a cyclone to the magical Land of Oz, where she sets off to meet the Wizard with three unforgettable friends. Simple, clear sentences — a perfect first novel in English.',
    source: 'Project Gutenberg #55 (public domain)',
    kind: 'gutenberg-numbered',
    url: 'https://raw.githubusercontent.com/GITenberg/The-Wonderful-Wizard-of-Oz_55/master/55.txt',
  },
  {
    id: 'sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1892,
    level: 'Intermediate',
    description:
      'Twelve classic detective stories told by Dr. Watson. Each adventure is self-contained, so one story makes a satisfying weekly challenge unit.',
    source: 'Project Gutenberg #1661 (public domain)',
    kind: 'gutenberg-roman',
    url: 'https://raw.githubusercontent.com/GITenberg/The-Adventures-of-Sherlock-Holmes_1661/master/1661.txt',
  },
  {
    id: 'great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    year: 1925,
    level: 'Advanced',
    description:
      'Nick Carraway narrates the glittering, doomed world of Jay Gatsby in 1920s New York. Rich, literary prose for readers who want a challenge.',
    source: 'Standard Ebooks / Project Gutenberg #64317 (public domain in the USA)',
    kind: 'standardebooks-xhtml',
    urlTemplate:
      'https://raw.githubusercontent.com/standardebooks/f-scott-fitzgerald_the-great-gatsby/master/src/epub/text/chapter-%d.xhtml',
    chapterCount: 9,
  },
  {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: 1865,
    level: 'Beginner',
    description:
      'Alice tumbles down a rabbit hole into a nonsensical world of talking rabbits, a grinning cat, and a tea party that never ends. Playful, dreamlike, and full of memorable vocabulary.',
    source: 'Project Gutenberg #11 (public domain)',
    kind: 'chapter-roman-titled',
    url: 'https://raw.githubusercontent.com/GITenberg/Alice-s-Adventures-in-Wonderland_11/master/11.txt',
  },
  {
    id: 'call-of-the-wild',
    title: 'The Call of the Wild',
    author: 'Jack London',
    year: 1903,
    level: 'Intermediate',
    description:
      'Buck, a domesticated dog, is stolen and sold into the brutal life of an Alaskan sled dog during the Klondike Gold Rush. Vivid, adventurous, and fast-paced.',
    source: 'Project Gutenberg #215 (public domain)',
    kind: 'chapter-roman-titled',
    url: 'https://raw.githubusercontent.com/GITenberg/The-Call-of-the-Wild_215/master/215.txt',
  },
  {
    id: 'christmas-carol',
    title: 'A Christmas Carol',
    author: 'Charles Dickens',
    year: 1843,
    level: 'Intermediate',
    description:
      'Miserly Ebenezer Scrooge is visited by three spirits on Christmas Eve who show him his past, present, and future. A short, classic ghost story of redemption.',
    source: 'Project Gutenberg #46 (public domain)',
    kind: 'stave-roman-titled',
    url: 'https://raw.githubusercontent.com/GITenberg/A-Christmas-Carol_46/master/46.txt',
  },
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    level: 'Advanced',
    description:
      "Elizabeth Bennet navigates manners, marriage, and misunderstandings with the proud Mr. Darcy. Witty, socially observant prose with long, elegant sentences.",
    source: 'Project Gutenberg #1342 (public domain)',
    kind: 'chapter-arabic-bare',
    url: 'https://raw.githubusercontent.com/GITenberg/Pride-and-Prejudice_1342/master/1342.txt',
  },
  {
    id: 'secret-garden',
    title: 'The Secret Garden',
    author: 'Frances Hodgson Burnett',
    year: 1911,
    level: 'Beginner',
    description:
      'A sickly, unloved orphan discovers a locked, forgotten garden on her uncle’s Yorkshire estate — and it changes everything. Gentle pacing, clear sentences.',
    source: 'Project Gutenberg #113 (public domain)',
    kind: 'chapter-roman-bare',
    url: 'https://raw.githubusercontent.com/GITenberg/The-Secret-Garden_113/master/113.txt',
  },
  {
    id: 'anne-of-green-gables',
    title: 'Anne of Green Gables',
    author: 'L. M. Montgomery',
    year: 1908,
    level: 'Beginner',
    description:
      'A talkative orphan girl is sent by mistake to an elderly brother and sister on Prince Edward Island, and wins over the whole town. Warm, gentle, and funny.',
    source: 'Project Gutenberg #45 (public domain)',
    kind: 'chapter-roman-titled',
    url: 'https://raw.githubusercontent.com/GITenberg/Anne-of-Green-Gables_45/master/45.txt',
  },
  {
    id: 'treasure-island',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    year: 1883,
    level: 'Intermediate',
    description:
      'Young Jim Hawkins finds a pirate treasure map and sails into danger and mutiny aboard the Hispaniola. Classic pirate adventure, brisk and exciting.',
    source: 'Project Gutenberg #120 (public domain)',
    kind: 'chapter-number-bare-titled',
    url: 'https://raw.githubusercontent.com/GITenberg/Treasure-Island_120/master/120.txt',
  },
  {
    id: 'jekyll-and-hyde',
    title: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
    author: 'Robert Louis Stevenson',
    year: 1886,
    level: 'Intermediate',
    description:
      'A London lawyer investigates the sinister connection between the respectable Dr. Jekyll and the monstrous Mr. Hyde. A short, gripping gothic mystery.',
    source: 'Project Gutenberg #43 (public domain)',
    kind: 'chapter-caps-bare',
    url: 'https://raw.githubusercontent.com/GITenberg/The-Strange-Case-of-Dr.-Jekyll-and-Mr.-Hyde_43/master/43.txt',
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    year: 1818,
    level: 'Advanced',
    description:
      'Victor Frankenstein creates a living being from dead flesh — and pays the price for playing god. Dense, philosophical gothic prose.',
    source: 'Project Gutenberg #84 (public domain)',
    kind: 'chapter-arabic-bare',
    url: 'https://raw.githubusercontent.com/GITenberg/Frankenstein_84/master/84.txt',
  },

  // --- The Bible (World English Bible) ------------------------------
  // A handful of the most commonly-read books, not the full 66-book
  // Bible, so the Library stays a reasonable size. Text comes verse-by-
  // verse from midvash/bible-data, a structured mirror of the WEB — see
  // fetchBibleChapters() below. `bible: true` marks these for the reader
  // (no "📜 원문 / ✨ 현대식 영어" toggle — the WEB is already modern
  // English) and tells scripts/modernize-books.mjs to skip them, since
  // AI-paraphrasing scripture would risk changing its meaning.
  {
    id: 'genesis',
    title: 'Genesis',
    author: 'World English Bible',
    year: 2000,
    level: 'Intermediate',
    bible: true,
    description:
      "The first book of the Bible: the creation of the world, Adam and Eve, Noah's flood, and the patriarchs Abraham, Isaac, Jacob, and Joseph — traditionally attributed to Moses. Sweeping origin stories told in straightforward narrative prose.",
    source: 'World English Bible (WEB), public domain — worldenglish.bible',
    kind: 'bible-web',
    osis: 'Gen',
  },
  {
    id: 'psalms',
    title: 'Psalms',
    author: 'World English Bible',
    year: 2000,
    level: 'Intermediate',
    bible: true,
    description:
      '150 songs and prayers of praise, lament, thanksgiving, and reflection, traditionally attributed chiefly to King David. Short, vivid, poetic chapters that read well one at a time.',
    source: 'World English Bible (WEB), public domain — worldenglish.bible',
    kind: 'bible-web',
    osis: 'Ps',
  },
  {
    id: 'proverbs',
    title: 'Proverbs',
    author: 'World English Bible',
    year: 2000,
    level: 'Beginner',
    bible: true,
    description:
      'Short, memorable sayings about wisdom, work, friendship, and character, traditionally attributed to Solomon. Each verse is a self-contained thought — easy to read a little at a time.',
    source: 'World English Bible (WEB), public domain — worldenglish.bible',
    kind: 'bible-web',
    osis: 'Prov',
  },
  {
    id: 'matthew',
    title: 'Matthew',
    author: 'World English Bible',
    year: 2000,
    level: 'Intermediate',
    bible: true,
    description:
      "The first Gospel: the birth, teaching, miracles, death, and resurrection of Jesus, with an eye to how his life fulfilled Hebrew prophecy. Clear, steady narrative prose.",
    source: 'World English Bible (WEB), public domain — worldenglish.bible',
    kind: 'bible-web',
    osis: 'Matt',
  },
  {
    id: 'john',
    title: 'John',
    author: 'World English Bible',
    year: 2000,
    level: 'Beginner',
    bible: true,
    description:
      'The most personal of the four Gospels, telling the story of Jesus through vivid scenes and extended first-person teaching. Simple vocabulary and short sentences make it a popular first book to read.',
    source: 'World English Bible (WEB), public domain — worldenglish.bible',
    kind: 'bible-web',
    osis: 'John',
  },
  {
    id: 'romans',
    title: 'Romans',
    author: 'World English Bible',
    year: 2000,
    level: 'Advanced',
    bible: true,
    description:
      "Paul's letter to the church in Rome, laying out core Christian teaching on sin, faith, and grace in dense, tightly-reasoned argument — a real step up in difficulty from the Gospels.",
    source: 'World English Bible (WEB), public domain — worldenglish.bible',
    kind: 'bible-web',
    osis: 'Rom',
  },
];

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

/**
 * Strip the Project Gutenberg boilerplate header/footer. Older
 * transcriptions (like these) have an informal "End of [the] Project
 * Gutenberg('s) EBook ..." line a few lines BEFORE the formal
 * "*** END OF ... ***" delimiter — cut at whichever comes first so that
 * stray line doesn't get swallowed into the last chapter's body text.
 */
function stripGutenberg(text) {
  const start = text.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*/i);
  let body = text;
  if (start !== -1) body = body.slice(body.indexOf('\n', start) + 1);

  const formalEnd = body.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*/i);
  const informalEnd = body.search(/^\s*End of (the )?Project Gutenberg/im);
  let cutAt = body.length;
  if (formalEnd !== -1) cutAt = Math.min(cutAt, formalEnd);
  if (informalEnd !== -1) cutAt = Math.min(cutAt, informalEnd);

  return body.slice(0, cutAt).replace(/\r\n/g, '\n');
}

/** Collapse hard-wrapped lines into paragraphs, dropping illustrations. */
function toParagraphs(chunk) {
  return chunk
    .split(/\n\s*\n+/)
    .map((p) =>
      p
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((p) => p && !/^\[Illustration[^\]]*\]$/i.test(p))
    .map((p) => p.replace(/\[Illustration[^\]]*\]/gi, '').trim())
    // Strip a leading "|" — some transcriptions use it to mark where a
    // decorative drop-cap goes at the start of a chapter (e.g. "|MRS.
    // Rachel Lynde lived...").
    .map((p) => p.replace(/^\|\s*/, ''))
    .filter((p) => p && !/^(the\s+)?end\.?$/i.test(p));
}

/**
 * Split a Gutenberg text into chapters by heading regex.
 *
 * The plain-text table of contents is made of right-aligned entries, so
 * some ToC lines end up starting at column 0 too (e.g. a 5-character roman
 * numeral "VIII." isn't indented like the shorter "  I." lines above it) —
 * a plain "must start at column 0" rule lets those slip through as bogus
 * headings. What actually distinguishes the ToC is that its entries sit
 * on immediately consecutive lines with zero gap (no blank line, no body
 * text) between them, while a real chapter heading always has blank lines
 * (and then body text) around it. So: a run of 3+ heading-like lines with
 * NO lines of any kind between them is the ToC and gets discarded outright;
 * anything else — including a heading directly after such a run, once a
 * blank line separates them — is a real chapter break.
 */
function splitByHeadings(body, headingRe, cleanTitle) {
  const lines = body.split('\n');
  const isMatch = lines.map((l) => headingRe.test(l));

  const tocLine = new Array(lines.length).fill(false);
  let runStart = null;
  let runEnd = null; // last line index in the current run (inclusive)
  const closeRun = () => {
    if (runStart !== null && runEnd - runStart + 1 >= 3) {
      for (let i = runStart; i <= runEnd; i += 1) tocLine[i] = true;
    }
    runStart = null;
    runEnd = null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    if (isMatch[i]) {
      if (runStart !== null && i === runEnd + 1) {
        runEnd = i; // immediately adjacent to the previous match: same run
      } else {
        closeRun();
        runStart = i;
        runEnd = i;
      }
    }
  }
  closeRun();

  const chapters = [];
  let current = null;
  for (let i = 0; i < lines.length; i += 1) {
    if (isMatch[i] && !tocLine[i]) {
      if (current) chapters.push(current);
      current = { title: cleanTitle(lines[i].trim()), text: '' };
    } else if (current && !tocLine[i]) {
      current.text += lines[i] + '\n';
    }
  }
  if (current) chapters.push(current);
  return chapters
    .map((c) => ({ title: c.title, paragraphs: toParagraphs(c.text) }))
    .filter((c) => {
      // Guards against loose heading regexes (e.g. an all-caps heuristic)
      // matching a stray title-page line or a letter's signature line: a
      // real chapter always has far more than a few words of body text.
      const wordCount = c.paragraphs.reduce((s, p) => s + p.split(/\s+/).length, 0);
      return wordCount >= 30;
    });
}

function parseGutenbergNumbered(text) {
  // Headings look like "1.  The Cyclone", occasionally indented by a
  // couple of spaces in the source transcription.
  return splitByHeadings(
    stripGutenberg(text),
    /^\s{0,4}\d{1,2}\.\s{1,4}\S/,
    (t) => t.replace(/\s{2,}/g, ' ')
  );
}

function parseGutenbergRoman(text) {
  // Headings look like "ADVENTURE I. A SCANDAL IN BOHEMIA" or
  // "VII. THE ADVENTURE OF THE BLUE CARBUNCLE".
  return splitByHeadings(
    stripGutenberg(text),
    /^\s{0,4}(ADVENTURE\s+)?[IVXLC]+\.\s+[A-Z]/,
    (t) =>
      titleCase(
        t
          .replace(/^ADVENTURE\s+[IVXLC]+\.\s+/, '')
          .replace(/^[IVXLC]+\.\s+/, '')
      )
  );
}

function parseChapterRomanTitled(text) {
  // Headings look like "CHAPTER I. Down the Rabbit-Hole" (Alice) or
  // "Chapter I. Into the Primitive" (Call of the Wild) — title case is
  // already correct in the source, so just strip the "Chapter <roman>. "
  // prefix without re-casing it.
  return splitByHeadings(
    stripGutenberg(text),
    /^\s{0,4}(CHAPTER|Chapter)\s+[IVXLC]+\.\s+[A-Z]/,
    (t) => t.replace(/^(CHAPTER|Chapter)\s+[IVXLC]+\.\s+/, '').trim()
  );
}

function parseStaveRomanTitled(text) {
  // A Christmas Carol calls its chapters "staves": "STAVE I:  MARLEY'S GHOST".
  return splitByHeadings(
    stripGutenberg(text),
    /^\s{0,4}STAVE\s+[IVXLC]+:\s*[A-Z]/,
    (t) => {
      const m = t.match(/^STAVE\s+([IVXLC]+):\s*(.+)$/);
      return m ? `Stave ${m[1]}: ${titleCase(m[2])}` : t.trim();
    }
  );
}

function parseChapterArabicBare(text) {
  // Headings are just "Chapter 1", "Chapter 2", … with no title text
  // (Pride and Prejudice's original chapters have no titles).
  return splitByHeadings(
    stripGutenberg(text),
    /^\s{0,4}Chapter\s+\d+\s*$/,
    (t) => t.trim().replace(/\s{2,}/g, ' ')
  );
}

/** True for a short, all-caps line — the shape of an inline chapter title. */
function looksLikeCapsTitle(line) {
  return (
    !!line &&
    line.split(/\s+/).length <= 8 &&
    /[A-Z]/.test(line) &&
    line === line.toUpperCase()
  );
}

function parseChapterNumberBareTitled(text) {
  // Headings are a bare number alone on its own line ("1", "2", …), with
  // the real chapter title as the very next paragraph (Treasure Island).
  const chapters = splitByHeadings(
    stripGutenberg(text),
    /^\s{0,2}\d{1,2}\s*$/,
    (t) => `Chapter ${t.trim()}`
  );
  return chapters.map((c) => {
    const [first, ...rest] = c.paragraphs;
    return first ? { title: `${c.title}: ${first}`, paragraphs: rest } : c;
  });
}

function parseChapterCapsBare(text) {
  // Headings are a short all-caps line with no numbering at all, e.g.
  // "STORY OF THE DOOR" (Dr. Jekyll and Mr. Hyde). Riskier than a numbered
  // anchor — the shared word-count filter in splitByHeadings drops the
  // false positives this book has (its own title page, a letter's
  // all-caps signature line).
  return splitByHeadings(
    stripGutenberg(text),
    /^[A-Z][A-Z'.,; -]{3,45}[A-Z]$/,
    (t) => titleCase(t.trim())
  );
}

function parseChapterRomanBare(text) {
  // Headings are just "CHAPTER I", "CHAPTER II", … with the real title
  // printed as its own all-caps line right after (not on the same line, and
  // not repeated before each chapter body — only Alice/Call-of-the-Wild-style
  // books put it inline). Promote that line into the title when present.
  const chapters = splitByHeadings(
    stripGutenberg(text),
    /^\s{0,4}CHAPTER\s+[IVXLC]+\s*$/,
    (t) => t.trim().replace(/^CHAPTER/, 'Chapter').replace(/\s{2,}/g, ' ')
  );
  return chapters.map((c) => {
    const [first, ...rest] = c.paragraphs;
    if (looksLikeCapsTitle(first)) {
      return { title: `${c.title}: ${titleCase(first)}`, paragraphs: rest };
    }
    return c;
  });
}

function titleCase(s) {
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  return s
    .toLowerCase()
    .split(' ')
    .map((w, i) => {
      const bareWord = w.replace(/^[^a-z]+/, '');
      if (i > 0 && small.has(bareWord)) return w;
      // Capitalize the first letter, wherever it is (skips leading quotes/dashes).
      const letterIndex = w.search(/[a-z]/);
      if (letterIndex === -1) return w;
      return w.slice(0, letterIndex) + w[letterIndex].toUpperCase() + w.slice(letterIndex + 1);
    })
    .join(' ');
}

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”', '&#8212;': '—', '&#8230;': '…', '&hellip;': '…', '&mdash;': '—' };

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m] ?? m);
}

/** Extract paragraph text from a Standard Ebooks chapter XHTML file. */
function parseXhtmlParagraphs(xhtml) {
  const paragraphs = [];
  const re = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(xhtml))) {
    const text = decodeEntities(
      m[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
    )
      .replace(/\s+/g, ' ')
      .trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

/**
 * Fetch one Bible book (World English Bible, public domain) as
 * chapter/verse JSON from midvash/bible-data — a structured mirror keyed
 * by OSIS book code — and reshape it to the app's { title, paragraphs }
 * chapter format. Each verse becomes its own paragraph, prefixed with its
 * verse number (e.g. "16 For God so loved the world…"), the way most
 * Bible readers print verse text — this also keeps citations legible
 * since paragraphs get regrouped into pages by word count.
 */
async function fetchBibleChapters(osis) {
  const url = `https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/web/books/${osis}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const data = await res.json();
  return data.chapters.map((c) => ({
    title: `Chapter ${c.chapter}`,
    paragraphs: c.verses.map((v) => `${v.number} ${v.text}`),
  }));
}

const countWords = (chapters) =>
  chapters.reduce(
    (sum, c) => sum + c.paragraphs.reduce((s, p) => s + p.split(/\s+/).length, 0),
    0
  );

const PLAIN_TEXT_PARSERS = {
  'gutenberg-numbered': parseGutenbergNumbered,
  'gutenberg-roman': parseGutenbergRoman,
  'chapter-roman-titled': parseChapterRomanTitled,
  'stave-roman-titled': parseStaveRomanTitled,
  'chapter-arabic-bare': parseChapterArabicBare,
  'chapter-roman-bare': parseChapterRomanBare,
  'chapter-number-bare-titled': parseChapterNumberBareTitled,
  'chapter-caps-bare': parseChapterCapsBare,
};

/**
 * --only=id1,id2 limits which books are actually re-fetched from the
 * network (handy when adding a few new books without re-downloading the
 * whole library). Every book in BOOKS still gets a manifest entry: for
 * ids outside --only, the already-committed public/books/<id>.json is
 * read back off disk instead of being re-fetched.
 */
function parseOnly(argv) {
  const arg = argv.find((a) => a.startsWith('--only='));
  return arg ? new Set(arg.slice('--only='.length).split(',').filter(Boolean)) : null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const only = parseOnly(process.argv.slice(2));
  const manifest = [];

  for (const book of BOOKS) {
    const filePath = path.join(OUT_DIR, `${book.id}.json`);
    const shouldFetch = !only || only.has(book.id);

    if (!shouldFetch) {
      if (!existsSync(filePath)) {
        throw new Error(`--only omits "${book.id}" but public/books/${book.id}.json doesn't exist yet — fetch it at least once.`);
      }
    } else {
      let chapters;
      if (book.kind === 'standardebooks-xhtml') {
        chapters = [];
        for (let i = 1; i <= book.chapterCount; i += 1) {
          const xhtml = await fetchText(book.urlTemplate.replace('%d', i));
          chapters.push({ title: `Chapter ${i}`, paragraphs: parseXhtmlParagraphs(xhtml) });
        }
      } else if (book.kind === 'bible-web') {
        chapters = await fetchBibleChapters(book.osis);
      } else {
        const text = await fetchText(book.url);
        const parse = PLAIN_TEXT_PARSERS[book.kind];
        if (!parse) throw new Error(`Unknown book kind: ${book.kind}`);
        chapters = parse(text);
      }

      const { kind, url, urlTemplate, chapterCount, osis, ...meta } = book;
      await writeFile(filePath, JSON.stringify({ ...meta, chapters }));
    }

    const record = JSON.parse(await readFile(filePath, 'utf8'));
    // Total page count (same level-aware pagination the in-app reader
    // uses), so the Library list can show a 14-day reading plan without
    // fetching the full book JSON.
    const targetWords = targetWordsForLevel(record.level);
    const totalPages = record.chapters.reduce(
      (sum, c) => sum + paginateParagraphs(c.paragraphs, targetWords).length,
      0
    );
    const wordCount = countWords(record.chapters);
    const { chapters, ...meta } = record;

    manifest.push({
      ...meta,
      chapterCount: chapters.length,
      wordCount,
      totalPages,
    });
    console.log(
      `${book.id}${shouldFetch ? '' : ' (cached)'}: ${chapters.length} chapters, ${wordCount.toLocaleString()} words, ${totalPages} pages`
    );
  }

  await writeFile(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`Wrote ${manifest.length} books to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
