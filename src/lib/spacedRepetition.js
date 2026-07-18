/*
 * Spaced-repetition scheduling — Leitner box system.
 *
 * WHY LEITNER (instead of SM-2)?
 *   The spec asks for a simple, predictable 1 → 3 → 7 → 14 day cadence.
 *   A Leitner box system maps directly onto that: each "box" has a fixed
 *   review interval, and a card moves between boxes depending on how well
 *   the learner remembered it. It is easier to reason about (and to debug)
 *   than SM-2's floating-point ease factors, while giving the same
 *   expanding-interval behaviour.
 *
 * HOW IT WORKS:
 *   - Boxes and their intervals (in days):
 *       box 0 → 1 day, box 1 → 3 days, box 2 → 7 days,
 *       box 3 → 14 days, box 4 → 30 days (graduated / long-term).
 *   - A newly starred word starts in box 0 and is due tomorrow.
 *   - When the learner reviews a card they grade themselves:
 *       "Hard"  → the card falls back to box 0 (see it again in 1 day).
 *       "Good"  → the card moves up one box.
 *       "Easy"  → the card jumps up two boxes (it was too easy to linger).
 *   - The next due date = now + interval(new box).
 */

export const BOX_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;

export const GRADES = { HARD: 'hard', GOOD: 'good', EASY: 'easy' };

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** State attached to a freshly starred word: box 0, due tomorrow. */
export function initialScheduleState(now = new Date()) {
  return {
    box: 0,
    dueDate: addDays(now, BOX_INTERVALS_DAYS[0]).toISOString(),
    lastReviewedAt: null,
    reviewCount: 0,
    lapses: 0, // times the learner answered "Hard"
  };
}

/**
 * Apply a review grade and return the *new* srs state (does not mutate).
 *
 * @param {object} srs   current state ({ box, dueDate, ... })
 * @param {string} grade one of GRADES.HARD / GOOD / EASY
 */
export function applyReview(srs, grade, now = new Date()) {
  let box;
  let lapses = srs.lapses || 0;

  switch (grade) {
    case GRADES.HARD:
      box = 0; // demote: relearn from the shortest interval
      lapses += 1;
      break;
    case GRADES.EASY:
      box = Math.min(MAX_BOX, srs.box + 2); // skip ahead
      break;
    case GRADES.GOOD:
    default:
      box = Math.min(MAX_BOX, srs.box + 1); // normal promotion
      break;
  }

  return {
    box,
    dueDate: addDays(now, BOX_INTERVALS_DAYS[box]).toISOString(),
    lastReviewedAt: now.toISOString(),
    reviewCount: (srs.reviewCount || 0) + 1,
    lapses,
  };
}

/** Human-friendly label, e.g. "in 3 days", shown under the grade buttons. */
export function nextIntervalLabel(srs, grade) {
  let box;
  if (grade === GRADES.HARD) box = 0;
  else if (grade === GRADES.EASY) box = Math.min(MAX_BOX, srs.box + 2);
  else box = Math.min(MAX_BOX, srs.box + 1);
  const days = BOX_INTERVALS_DAYS[box];
  return days === 1 ? '1 day' : `${days} days`;
}

/** True when the entry should appear in today's review queue. */
export function isDue(srs, now = new Date()) {
  return !!srs && srs.dueDate <= now.toISOString();
}
