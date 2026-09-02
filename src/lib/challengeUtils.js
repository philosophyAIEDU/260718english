/*
 * Challenge date/attendance math — a direct port of the date and status
 * logic from philosophyAIEDU/260818comingssoni's js/utils.js, adapted to
 * ES modules and this app's CHALLENGE_CONFIG. Pure functions, no Firebase
 * access, so they're easy to test and reuse from both the participant and
 * admin screens.
 *
 * Attendance status per day, per participant:
 *   'O' verified   'X' missed (deadline passed, nothing on time)
 *   'P' exempted    '-' not decided yet (today, before the deadline, or future)
 *   '·' outside their participation window (before joining / after leaving)
 */
import { CHALLENGE_CONFIG } from './challengeConfig.js';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** The challenge timezone's current date/time, split into parts. */
function nowParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHALLENGE_CONFIG.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const { type, value } of fmt.formatToParts(new Date())) parts[type] = value;
  // Intl can report midnight as hour '24'.
  const h = parts.hour === '24' ? 0 : Number(parts.hour);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, h, m: Number(parts.minute), s: Number(parts.second) };
}

/** Today's date (YYYY-MM-DD) in the challenge timezone. */
export function today() {
  return nowParts().date;
}

/** Seconds remaining until today's deadline (usually midnight). */
export function secondsToDeadline() {
  const { h, m, s } = nowParts();
  return CHALLENGE_CONFIG.deadlineHour * 3600 - (h * 3600 + m * 60 + s);
}

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(dt) {
  return dt.toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const dt = toDate(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toISO(dt);
}

export function dateRange(from, to) {
  const out = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 1000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function weekdayKo(iso) {
  return WEEKDAY_KO[toDate(iso).getUTCDay()];
}

/** '9/8(화)' style label. */
export function shortLabel(iso) {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}(${weekdayKo(iso)})`;
}

/** Every date in the challenge window, inclusive. */
export function challengeDates() {
  return dateRange(CHALLENGE_CONFIG.startDate, CHALLENGE_CONFIG.endDate);
}

/** Which challenge day (1-based) a given date falls on, or null outside the window. */
export function dayIndex(iso) {
  const dates = challengeDates();
  const i = dates.indexOf(iso);
  return i === -1 ? null : i + 1;
}

/** 'before' | 'running' | 'after' relative to the challenge window. */
export function phase(iso) {
  const t = iso || today();
  if (t < CHALLENGE_CONFIG.startDate) return 'before';
  if (t > CHALLENGE_CONFIG.endDate) return 'after';
  return 'running';
}

/** The last date whose deadline has already passed (yesterday), or null if none yet. */
export function lastSettledDate() {
  const y = addDays(today(), -1);
  if (y < CHALLENGE_CONFIG.startDate) return null;
  return y > CHALLENGE_CONFIG.endDate ? CHALLENGE_CONFIG.endDate : y;
}

/** Which challenge week (1-based) a date falls in, or null outside the window. */
export function weekIndex(iso) {
  const day = dayIndex(iso || today());
  return day ? Math.ceil(day / 7) : null;
}

/**
 * Where the challenge stands right now, for the Home dashboard hero:
 * which day/week we're on, how far along, and how many days until it
 * starts (or since it ended) when we're outside the window.
 */
export function challengeProgress(todayISO) {
  const t = todayISO || today();
  const dates = challengeDates();
  const totalDays = dates.length;
  const currentPhase = phase(t);
  const day = dayIndex(t);
  const totalWeeks = Math.ceil(totalDays / 7);

  return {
    phase: currentPhase,
    totalDays,
    totalWeeks,
    day,
    week: weekIndex(t),
    // Before the start we show a countdown; after the end, the full bar.
    percent:
      currentPhase === 'before' ? 0 : currentPhase === 'after' ? 100 : Math.round((day / totalDays) * 100),
    daysUntilStart: currentPhase === 'before' ? diffDays(t, CHALLENGE_CONFIG.startDate) : 0,
    daysLeft: currentPhase === 'running' ? totalDays - day : 0,
  };
}

function diffDays(from, to) {
  return Math.round((toDate(to) - toDate(from)) / 86400000);
}

export function nowStamp() {
  return new Date().toISOString();
}

/** The UTC instant a given date's deadline falls at, for comparing against createdAt. */
export function deadlineInstant(date) {
  // Asia/Seoul is UTC+9 with no DST, so 24:00 KST == 15:00 UTC the same day.
  // (If CHALLENGE_CONFIG.timezone is ever changed away from Asia/Seoul, this
  // offset assumption should be revisited.)
  return `${date}T15:00:00.000Z`;
}

/** Was a submission created after its date's deadline had already passed? */
export function isLate(date, createdAt) {
  return Boolean(createdAt) && createdAt > deadlineInstant(date);
}

export function normalizeNick(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

/**
 * One participant's status on one date.
 * @param {object} participant { joinDate, status, outDate, exemptDates }
 * @param {string} date
 * @param {Map<string, object>} submissionByDate participantId's submissions keyed by date
 * @param {string} todayISO
 */
export function statusFor(participant, date, submissionByDate, todayISO) {
  if (participant.joinDate && date < participant.joinDate) return '·';
  if (participant.status === 'out' && participant.outDate && date > participant.outDate) return '·';
  const sub = submissionByDate.get(date);
  if (sub && !isLate(date, sub.createdAt)) return 'O';
  if ((participant.exemptDates || []).includes(date)) return 'P';
  if (date >= todayISO) return '-';
  return 'X';
}

/**
 * Per-participant attendance stats over the whole challenge window.
 * @param {object[]} participants
 * @param {object[]} submissions flat list, each with participantId/date/createdAt
 */
export function buildStats(participants, submissions, todayISO) {
  const t = todayISO || today();
  const dates = challengeDates();
  const byParticipant = new Map();
  for (const s of submissions) {
    if (!byParticipant.has(s.participantId)) byParticipant.set(s.participantId, new Map());
    byParticipant.get(s.participantId).set(s.date, s);
  }

  return participants.map((p) => {
    const subMap = byParticipant.get(p.id) || new Map();
    const cells = dates.map((d) => ({ date: d, status: statusFor(p, d, subMap, t) }));
    const missed = cells.filter((c) => c.status === 'X').length;
    const verified = cells.filter((c) => c.status === 'O').length;
    const exempt = cells.filter((c) => c.status === 'P').length;
    const gradable = verified + missed;

    let streak = 0;
    for (const d of [...dates].filter((d) => d <= t).reverse()) {
      const st = statusFor(p, d, subMap, t);
      if (st === 'O') streak += 1;
      else if (st === 'P' || (d === t && st === '-')) continue;
      else break;
    }

    return {
      participant: p,
      cells,
      missed,
      verified,
      exempt,
      rate: gradable ? Math.round((verified / gradable) * 100) : 0,
      streak,
      submittedToday: subMap.has(t),
      atRisk: missed >= CHALLENGE_CONFIG.riskThreshold,
      kickoutEligible: missed >= CHALLENGE_CONFIG.kickoutThreshold,
    };
  });
}

/** A single participant's status badge { tone, label } for UI display. */
export function riskTag(stat) {
  if (stat.participant.status === 'out') {
    return stat.participant.kickReason === 'kickout'
      ? { tone: 'bad', label: '킥아웃' }
      : { tone: 'bad', label: '아웃' };
  }
  if (stat.kickoutEligible) return { tone: 'bad', label: '킥아웃 대상' };
  if (stat.atRisk) return { tone: 'warn', label: '위험' };
  return { tone: 'ok', label: '참여중' };
}
