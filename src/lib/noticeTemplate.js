/*
 * Builds the day's KakaoTalk notice text so the organizer never starts
 * from a blank message — same idea as 260818comingssoni's per-date notice
 * drafts, but generated on the fly from CHALLENGE_CONFIG/CURRICULUM
 * instead of needing to be pre-written and saved for each date.
 */
import { CHALLENGE_CONFIG, CURRICULUM } from './challengeConfig.js';
import { today, dayIndex, weekIndex, phase, longLabel } from './challengeUtils.js';

/** Today's default notice text, ready to edit and copy into the group chat. */
export function buildDailyNotice(date = today()) {
  const day = dayIndex(date);
  const week = weekIndex(date);
  const lesson = CURRICULUM.find((c) => c.week === week);
  const lines = [`📖 ${CHALLENGE_CONFIG.title} — ${longLabel(date)}`, ''];

  if (phase(date) === 'before') {
    lines.push(`아직 챌린지 시작 전이에요. ${CHALLENGE_CONFIG.startDate}부터 매일 인증이 시작됩니다!`);
  } else if (phase(date) === 'after') {
    lines.push('챌린지가 모두 끝났어요. 한 달간 정말 고생 많으셨습니다! 🎉');
  } else {
    lines.push(`Day ${day} 인증 안내드려요.`);
    lines.push('영어 원서 읽기 또는 듣기, 오늘 안에 인증 부탁드립니다 (마감: 오늘 밤 24시).');
    lines.push('읽기가 부담되시면 라이브러리의 듣기 파일만 들으셔도 인증됩니다 🎧');
    if (lesson) {
      lines.push('');
      lines.push(`🧑‍💻 이번 주(${week}주차) 앱 빌드 수업: ${lesson.title}`);
      lines.push(lesson.summary);
    }
  }

  if (CHALLENGE_CONFIG.appUrl) {
    lines.push('');
    lines.push(`👉 인증하기: ${CHALLENGE_CONFIG.appUrl}`);
  }

  lines.push('');
  lines.push('오늘 하루도 화이팅입니다! 🔥');
  return lines.join('\n');
}
