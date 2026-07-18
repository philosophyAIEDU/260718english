/*
 * Aggregates raw IndexedDB records (activity log, vocab book, book
 * progress) into the flat stats object that streaks.js and badges.js
 * consume. Kept separate from db.js so the aggregation math is easy to
 * unit test without touching IndexedDB.
 */
import { currentStreak, longestStreak } from './streaks.js';

export function computeStats({ activity, vocab, bookProgress }) {
  const dates = activity.map((a) => a.date);
  const wordsRead = activity
    .filter((a) => a.source === 'library')
    .reduce((sum, a) => sum + (a.wordCount || 0), 0);

  const chaptersCompleted = bookProgress.reduce(
    (sum, b) => sum + (b.completedChapterIndices?.length || 0),
    0
  );
  const booksCompleted = bookProgress.filter((b) => b.bookCompleted).length;
  const totalReviews = vocab.reduce((sum, v) => sum + (v.srs?.reviewCount || 0), 0);

  return {
    totalSessions: activity.length,
    distinctDays: new Set(dates).size,
    currentStreak: currentStreak(dates),
    longestStreak: longestStreak(dates),
    vocabCount: vocab.length,
    wordsRead,
    chaptersCompleted,
    booksCompleted,
    totalReviews,
  };
}
