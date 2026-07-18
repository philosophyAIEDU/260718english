/*
 * Reading-streak math over the set of days the learner was active
 * (scanned a photo or analyzed a library page at least once that day).
 *
 * Pure functions, no IndexedDB access, so they're easy to unit test —
 * callers pass in the distinct 'YYYY-MM-DD' date strings from the
 * `activity` store (see db.js: getAllActivity / localDateString).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/**
 * Current streak: consecutive active days counting back from today.
 * If today has no activity yet, the streak still counts through
 * yesterday (so it doesn't reset to 0 the moment the clock rolls over —
 * the learner has until the end of today to keep it alive).
 */
export function currentStreak(dateStrings, today = new Date()) {
  const days = new Set(dateStrings.map(toUtcDayNumber));
  if (days.size === 0) return 0;

  const todayNum = toUtcDayNumber(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  let cursor = days.has(todayNum) ? todayNum : todayNum - 1;
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

/** Longest run of consecutive active days in the learner's whole history. */
export function longestStreak(dateStrings) {
  const days = [...new Set(dateStrings.map(toUtcDayNumber))].sort((a, b) => a - b);
  if (days.length === 0) return 0;

  let longest = 1;
  let running = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] === days[i - 1] + 1) {
      running += 1;
    } else {
      longest = Math.max(longest, running);
      running = 1;
    }
  }
  return Math.max(longest, running);
}

export function isActiveToday(dateStrings, today = new Date()) {
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStrings.includes(todayStr);
}

/**
 * A calendar strip of the last `days` days (oldest first), each flagged
 * active/inactive, for a simple heat-map style progress view.
 */
export function recentDayGrid(dateStrings, days = 35, today = new Date()) {
  const active = new Set(dateStrings);
  const grid = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    grid.push({ date: key, active: active.has(key), isToday: i === 0 });
  }
  return grid;
}
