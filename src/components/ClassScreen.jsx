import { CHALLENGE_CONFIG, CURRICULUM } from '../lib/challengeConfig.js';
import { challengeDates, weekIndex, today, phase, addDays } from '../lib/challengeUtils.js';
import { ArrowLeftIcon, BranchIcon, CalendarIcon, CheckIcon } from './Icons.jsx';

/** The date range a given challenge week covers, as '9/8 – 9/14'. */
function weekRange(week) {
  const dates = challengeDates();
  const start = dates[(week - 1) * 7];
  if (!start) return '';
  const end = dates[Math.min(week * 7 - 1, dates.length - 1)] || addDays(start, 6);
  const fmt = (iso) => {
    const [, m, d] = iso.split('-');
    return `${Number(m)}/${Number(d)}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * The weekly app-building classes: one card per week of CURRICULUM, with
 * the week we're currently in pulled to the top and highlighted so a
 * learner opening this mid-challenge sees "what am I building this week"
 * before anything else.
 */
export default function ClassScreen({ onBack }) {
  const running = phase() === 'running';
  const currentWeek = running ? weekIndex(today()) : null;
  const current = CURRICULUM.find((c) => c.week === currentWeek);

  return (
    <section>
      <button className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={16} /> 홈으로
      </button>

      <div className="section-head">
        <span className="eyebrow">주 1회 · 월 {CURRICULUM.length}회</span>
        <h2>AI로 나만의 학습앱 만들기</h2>
        <p>
          내 학습에 도움이 되는 앱을 직접 만들어봅니다. 데이터베이스와 AI API도
          연동해서, 마지막 주에는 실제로 배포까지 합니다.
        </p>
      </div>

      {current && (
        <div className="hero" style={{ paddingBottom: 22 }}>
          <p className="hero-eyebrow">
            <BranchIcon size={13} /> 이번 주 수업 · {current.week}주차
          </p>
          <h1 className="hero-title" style={{ fontSize: '1.4rem' }}>
            {current.title}
          </h1>
          <p className="hero-lead">{current.summary}</p>
        </div>
      )}

      {!running && (
        <div className="notice">
          <CalendarIcon size={18} />
          <span>
            {phase() === 'before'
              ? `${CHALLENGE_CONFIG.startDate}에 챌린지가 시작되면 1주차 수업부터 진행됩니다.`
              : '챌린지가 종료되었습니다. 다음 기수에서 다시 만나요!'}
          </span>
        </div>
      )}

      <div className="card">
        <div className="timeline">
          {CURRICULUM.map((item) => (
            <div
              className={`timeline-item ${
                currentWeek === item.week ? 'is-current' : currentWeek > item.week ? 'is-done' : ''
              }`}
              key={item.week}
            >
              <span className="timeline-dot">
                {currentWeek > item.week ? <CheckIcon size={13} /> : item.week}
              </span>
              <span className="timeline-week">
                {item.week}주차 · {weekRange(item.week)}
              </span>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="topic-chips">
                {item.topics.map((topic) => (
                  <span className="topic-chip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="notice">
        <BranchIcon size={18} />
        <span>
          수업 일정과 참여 링크는 챌린지 단톡방에서 공지됩니다. 수업 전까지 그 주의
          읽기·듣기 인증을 채워두면 만든 앱에 넣을 학습 기록이 쌓여 있어요.
        </span>
      </div>
    </section>
  );
}
