/*
 * Word-deck sharing — export the Word Book as a ReadMate-native JSON file
 * and import one someone else shared, so a reading-challenge group can pass
 * around a common vocabulary deck (e.g. "this week's 50 words") without any
 * server. Personal review progress is intentionally left out of exports so
 * every recipient starts each word fresh in their own spaced-repetition
 * schedule.
 */

const DECK_FORMAT = 'readmate-deck';
const DECK_VERSION = 1;

/** Build the exportable deck object (JSON-serializable, no SRS state). */
export function buildDeckExport(entries, { title } = {}) {
  return {
    format: DECK_FORMAT,
    version: DECK_VERSION,
    title: title || null,
    exportedAt: new Date().toISOString(),
    count: entries.length,
    words: entries.map((v) => ({
      word: v.word,
      partOfSpeech: v.partOfSpeech || '',
      collinsDefinition: v.collinsDefinition || '',
      longmanSynonyms: v.longmanSynonyms || [],
      exampleFromPage: v.exampleFromPage || '',
      wordFamily: v.wordFamily || [],
      collocations: v.collocations || [],
      register: v.register || 'neutral',
      tags: v.tags || [],
    })),
  };
}

export class DeckImportError extends Error {}

/**
 * Parse and validate a deck JSON string. Throws DeckImportError with a
 * user-facing message if the file doesn't look like a ReadMate deck.
 */
export function parseDeckImport(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new DeckImportError('This file is not valid JSON.');
  }

  if (!data || data.format !== DECK_FORMAT || !Array.isArray(data.words)) {
    throw new DeckImportError('This file is not a ReadMate word deck.');
  }

  const words = data.words
    .filter((w) => w && typeof w.word === 'string' && w.word.trim())
    .map((w) => ({
      word: w.word.trim(),
      partOfSpeech: w.partOfSpeech || '',
      collinsDefinition: w.collinsDefinition || '',
      longmanSynonyms: Array.isArray(w.longmanSynonyms) ? w.longmanSynonyms : [],
      exampleFromPage: w.exampleFromPage || '',
      wordFamily: Array.isArray(w.wordFamily) ? w.wordFamily : [],
      collocations: Array.isArray(w.collocations) ? w.collocations : [],
      register: w.register || 'neutral',
      tags: Array.isArray(w.tags) ? w.tags : [],
    }));

  if (words.length === 0) {
    throw new DeckImportError('This deck file has no words in it.');
  }

  return { title: data.title || null, words };
}
