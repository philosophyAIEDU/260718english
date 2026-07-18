/*
 * Badge (milestone) definitions for the reading challenge.
 *
 * Badges are computed on the fly from aggregate stats — nothing about
 * "earned" state is stored separately, so there's no migration risk if the
 * badge list changes later; a badge is simply earned whenever `test(stats)`
 * is true for the learner's current numbers.
 *
 * `stats` shape (see lib/statsUtils.js:computeStats):
 *   { totalSessions, distinctDays, currentStreak, longestStreak,
 *     vocabCount, wordsRead, booksCompleted, chaptersCompleted,
 *     totalReviews }
 */

export const BADGES = [
  {
    id: 'first-page',
    title: 'First Page',
    description: 'Analyze your very first page.',
    test: (s) => s.totalSessions >= 1,
  },
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Read on 3 days in a row.',
    test: (s) => s.currentStreak >= 3 || s.longestStreak >= 3,
  },
  {
    id: 'streak-7',
    title: 'One Week Strong',
    description: 'Read on 7 days in a row.',
    test: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    id: 'streak-30',
    title: 'Habit Formed',
    description: 'Read on 30 days in a row.',
    test: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },
  {
    id: 'words-25',
    title: 'Word Collector',
    description: 'Save 25 words to your Word Book.',
    test: (s) => s.vocabCount >= 25,
  },
  {
    id: 'words-100',
    title: 'Vocabulary Builder',
    description: 'Save 100 words to your Word Book.',
    test: (s) => s.vocabCount >= 100,
  },
  {
    id: 'chapter-1',
    title: 'Chapter Finished',
    description: 'Finish a full chapter in the Library.',
    test: (s) => s.chaptersCompleted >= 1,
  },
  {
    id: 'book-1',
    title: 'Book Finished',
    description: 'Finish an entire book in the Library.',
    test: (s) => s.booksCompleted >= 1,
  },
  {
    id: 'reviews-25',
    title: 'Review Regular',
    description: 'Complete 25 flashcard reviews.',
    test: (s) => s.totalReviews >= 25,
  },
  {
    id: 'words-read-10000',
    title: '10,000 Words Read',
    description: 'Read 10,000 words from the Library.',
    test: (s) => s.wordsRead >= 10000,
  },
];

/** Returns BADGES annotated with `earned: boolean` for the given stats. */
export function evaluateBadges(stats) {
  return BADGES.map((b) => ({ ...b, earned: b.test(stats) }));
}
