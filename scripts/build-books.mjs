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
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    .filter(Boolean);
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
    .filter((c) => c.paragraphs.length > 0);
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

function titleCase(s) {
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  return s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
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

const countWords = (chapters) =>
  chapters.reduce(
    (sum, c) => sum + c.paragraphs.reduce((s, p) => s + p.split(/\s+/).length, 0),
    0
  );

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];

  for (const book of BOOKS) {
    let chapters;
    if (book.kind === 'standardebooks-xhtml') {
      chapters = [];
      for (let i = 1; i <= book.chapterCount; i += 1) {
        const xhtml = await fetchText(book.urlTemplate.replace('%d', i));
        chapters.push({ title: `Chapter ${i}`, paragraphs: parseXhtmlParagraphs(xhtml) });
      }
    } else {
      const text = await fetchText(book.url);
      chapters =
        book.kind === 'gutenberg-roman'
          ? parseGutenbergRoman(text)
          : parseGutenbergNumbered(text);
    }

    const { kind, url, urlTemplate, chapterCount, ...meta } = book;
    const record = { ...meta, chapters };
    await writeFile(
      path.join(OUT_DIR, `${book.id}.json`),
      JSON.stringify(record)
    );
    manifest.push({
      ...meta,
      chapterCount: chapters.length,
      wordCount: countWords(chapters),
    });
    console.log(
      `${book.id}: ${chapters.length} chapters, ${countWords(chapters).toLocaleString()} words`
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
