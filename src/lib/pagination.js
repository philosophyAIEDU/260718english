/*
 * Splits a chapter's paragraphs into book-page-sized chunks so the Library
 * reader feels like turning real pages (and so each "Analyze this page"
 * call stays a reasonable, page-sized amount of text for Gemini).
 */

const TARGET_WORDS_PER_PAGE = 280;

/*
 * Beginners do better with shorter, more digestible chunks — a big wall of
 * text is discouraging before you've built any reading stamina. Pages
 * shrink by level so a Beginner "page" is a lighter commitment than an
 * Advanced one. Both the build script (for the Library's page/day chip)
 * and the in-app reader use this same table, so the two always agree.
 */
const WORDS_PER_PAGE_BY_LEVEL = {
  Beginner: 150,
  Intermediate: 220,
  Advanced: 280,
};

export function targetWordsForLevel(level) {
  return WORDS_PER_PAGE_BY_LEVEL[level] || TARGET_WORDS_PER_PAGE;
}

function wordCount(str) {
  return str.split(/\s+/).filter(Boolean).length;
}

/**
 * @param {string[]} paragraphs
 * @returns {{ paragraphs: string[], wordCount: number }[]} pages
 */
export function paginateParagraphs(paragraphs, targetWords = TARGET_WORDS_PER_PAGE) {
  const pages = [];
  let current = [];
  let currentWords = 0;

  for (const p of paragraphs) {
    const w = wordCount(p);
    if (current.length > 0 && currentWords + w > targetWords) {
      pages.push({ paragraphs: current, wordCount: currentWords });
      current = [];
      currentWords = 0;
    }
    current.push(p);
    currentWords += w;
  }
  if (current.length > 0) {
    pages.push({ paragraphs: current, wordCount: currentWords });
  }
  return pages;
}

/** Reading challenges on ReadMate run in 14-day cycles. */
export const CHALLENGE_DAYS = 14;

/** Pages/day needed to finish a book of `totalPages` within one 14-day cycle. */
export function pagesPerDay(totalPages, days = CHALLENGE_DAYS) {
  return Math.max(1, Math.ceil(totalPages / days));
}

/** Which challenge day (1–14) a given page index falls on. */
export function dayForPageIndex(pageIndex, totalPages, days = CHALLENGE_DAYS) {
  const perDay = pagesPerDay(totalPages, days);
  return Math.min(days, Math.floor(pageIndex / perDay) + 1);
}
