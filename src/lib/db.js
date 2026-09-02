/*
 * IndexedDB wrapper built on the `idb` library.
 *
 * Everything Read & Build persists lives here, in the user's browser only:
 *  - `settings`     : key/value store (Gemini API key, theme preference).
 *  - `vocab`        : starred vocabulary entries with spaced-repetition state.
 *  - `activity`     : one record per completed analysis (photo or library
 *                      page), used to compute reading streaks and badges.
 *  - `bookProgress` : per-book reading position, for the library reader.
 *
 * Nothing is ever sent to any server other than the direct Gemini API call
 * the user triggers with their own key.
 */
import { openDB } from 'idb';
import { initialScheduleState } from './spacedRepetition.js';

const DB_NAME = 'readmate';
const DB_VERSION = 2;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('vocab')) {
          const store = db.createObjectStore('vocab', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('word', 'word', { unique: false });
          store.createIndex('dueDate', 'srs.dueDate', { unique: false });
          store.createIndex('register', 'register', { unique: false });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('activity')) {
            const activity = db.createObjectStore('activity', {
              keyPath: 'id',
              autoIncrement: true,
            });
            activity.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('bookProgress')) {
            db.createObjectStore('bookProgress', { keyPath: 'bookId' });
          }
        }
      },
    });
  }
  return dbPromise;
}

/* ---------------------------------- settings --------------------------- */

export async function getSetting(key) {
  const db = await getDB();
  return db.get('settings', key);
}

export async function setSetting(key, value) {
  const db = await getDB();
  return db.put('settings', value, key);
}

export async function deleteSetting(key) {
  const db = await getDB();
  return db.delete('settings', key);
}

/* ----------------------------------- vocab ----------------------------- */

/**
 * Save a starred vocabulary entry. `entry` is the vocabulary object returned
 * by Gemini (word, definitions, example, ...). Duplicate words (case
 * insensitive) are skipped and the existing record is returned instead.
 */
export async function saveVocabEntry(entry) {
  const db = await getDB();
  const existing = await findVocabByWord(entry.word);
  if (existing) return existing;

  const record = {
    word: entry.word,
    partOfSpeech: entry.partOfSpeech || '',
    collinsDefinition: entry.collinsDefinition || '',
    longmanSynonyms: entry.longmanSynonyms || [],
    exampleFromPage: entry.exampleFromPage || '',
    wordFamily: entry.wordFamily || [],
    collocations: entry.collocations || [],
    register: entry.register || 'neutral',
    tags: entry.tags || [],
    savedAt: new Date().toISOString(),
    srs: initialScheduleState(),
  };
  const id = await db.add('vocab', record);
  return { ...record, id };
}

export async function findVocabByWord(word) {
  const db = await getDB();
  const all = await db.getAll('vocab');
  const target = String(word || '').trim().toLowerCase();
  return all.find((v) => v.word.trim().toLowerCase() === target) || null;
}

export async function getAllVocab() {
  const db = await getDB();
  const all = await db.getAll('vocab');
  return all.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function updateVocabEntry(record) {
  const db = await getDB();
  return db.put('vocab', record);
}

export async function deleteVocabEntry(id) {
  const db = await getDB();
  return db.delete('vocab', id);
}

/** Entries whose next review date is today or earlier. */
export async function getDueVocab(now = new Date()) {
  const all = await getAllVocab();
  const cutoff = now.toISOString();
  return all.filter((v) => v.srs && v.srs.dueDate <= cutoff);
}

export async function countDueVocab(now = new Date()) {
  const due = await getDueVocab(now);
  return due.length;
}

/* ---------------------------------- activity ---------------------------- */

/** Local YYYY-MM-DD (not UTC) so a streak's "day" matches the user's clock. */
export function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Log one completed page analysis (photo scan or library page) for streak
 * and badge tracking.
 *
 * @param {object} entry { source: 'photo'|'library', bookId?, bookTitle?,
 *   chapterTitle?, pageIndex?, wordCount }
 */
export async function logActivity(entry) {
  const db = await getDB();
  const record = {
    date: localDateString(),
    createdAt: new Date().toISOString(),
    source: entry.source,
    bookId: entry.bookId || null,
    bookTitle: entry.bookTitle || null,
    chapterTitle: entry.chapterTitle || null,
    pageIndex: typeof entry.pageIndex === 'number' ? entry.pageIndex : null,
    wordCount: entry.wordCount || 0,
  };
  const id = await db.add('activity', record);
  return { ...record, id };
}

export async function getAllActivity() {
  const db = await getDB();
  return db.getAll('activity');
}

/* -------------------------------- bookProgress -------------------------- */

export async function getBookProgress(bookId) {
  const db = await getDB();
  return db.get('bookProgress', bookId);
}

export async function getAllBookProgress() {
  const db = await getDB();
  return db.getAll('bookProgress');
}

export async function saveBookProgress(record) {
  const db = await getDB();
  return db.put('bookProgress', record);
}
