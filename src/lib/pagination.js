/*
 * Splits a chapter's paragraphs into book-page-sized chunks so the Library
 * reader feels like turning real pages (and so each "Analyze this page"
 * call stays a reasonable, page-sized amount of text for Gemini).
 */

const TARGET_WORDS_PER_PAGE = 280;

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
