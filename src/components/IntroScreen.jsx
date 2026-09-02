import {
  CHALLENGE_CONFIG,
  PILLARS,
  RULES,
  CURRICULUM,
} from '../lib/challengeConfig.js';
import { challengeDates, weekIndex, today, phase } from '../lib/challengeUtils.js';
import {
  ICONS,
  SparklesIcon,
  ArrowLeftIcon,
  CheckIcon,
  ArrowRightIcon,
} from './Icons.jsx';

/**
 * The challenge's front door: what [Read & Build] is, how the month runs,
 * what the four weekly classes cover, and the rules that decide a kickout.
 * Shown once before a learner sets up their API key, and re-openable any
 * time from Home ("챌린지 안내").
 *
 * Everything here reads from challengeConfig.js, so the organizer changes
 * the program in one file and this screen follows.
 */
export default function IntroScreen({ onStart, onBack, startLabel = '시작하기' }) {
  const totalDays = challengeDates().length;
  const currentWeek = phase() === 'running' ? weekIndex(today()) : null;

  return (
    <section>
      {onBack && (
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> 돌아가기
        </button>
      )}

      <div className="hero">
        <p className="hero-eyebrow">
          <SparklesIcon size={13} /> 필로소피 AI 교육
        </p>
        <h1 className="hero-title">{CHALLENGE_CONFIG.title}</h1>
        <p className="hero-lead">{CHALLENGE_CONFIG.tagline}</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <strong>{totalDays}일</strong>
            <span>주 7일 인증</span>
          </div>
          <div className="hero-stat">
            <strong>{CURRICULUM.length}회</strong>
            <span>앱 빌드 수업</span>
          </div>
        </div>
      </div>

      <p className="manifesto">{CHALLENGE_CONFIG.manifesto}</p>

      <div className="section-head">
        <span className="eyebrow">무엇을 하나요</span>
        <h2>읽고, 만들고, 매일 인증합니다</h2>
        <p>
          영어 원문 읽기가 부담스러우시다면 듣기만 하셔도 됩니다. 원문마다 듣기
          파일이 준비되어 있어요.
        </p>
      </div>
      <div className="pillar-grid">
        {PILLARS.map((pillar) => {
          const Icon = ICONS[pillar.icon] || SparklesIcon;
          return (
            <div className="pillar" key={pillar.title}>
              <span className="pillar-icon">
                <Icon size={19} />
              </span>
              <strong>{pillar.title}</strong>
              <p>{pillar.body}</p>
            </div>
          );
        })}
      </div>

      <div className="section-head">
        <span className="eyebrow">{CURRICULUM.length}주 커리큘럼</span>
        <h2>AI로 나만의 학습앱 만들기</h2>
        <p>
          1주일에 1번씩 월 {CURRICULUM.length}번 수업이 진행됩니다. 내 학습에 도움이
          되는 앱을 만들어보고 데이터베이스와 AI API도 연동해봅니다.
        </p>
      </div>
      <div className="card">
        <div className="timeline">
          {CURRICULUM.map((item) => (
            <div
              className={`timeline-item ${
                currentWeek === item.week ? 'is-current' : currentWeek > item.week ? 'is-done' : ''
              }`}
              key={item.week}
            >
              <span className="timeline-dot">{item.week}</span>
              <span className="timeline-week">{item.week}주차</span>
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

      <div className="section-head">
        <span className="eyebrow">챌린지 규칙</span>
        <h2>이것만 지키면 됩니다</h2>
      </div>
      <div className="card">
        <div className="rule-list">
          {RULES.map((rule) => {
            const Icon = ICONS[rule.icon] || CheckIcon;
            return (
              <div
                className={`rule-item ${rule.icon === 'alert' ? 'is-warn' : ''}`}
                key={rule.title}
              >
                <span className="rule-icon">
                  <Icon size={17} />
                </span>
                <div className="rule-body">
                  <strong>{rule.title}</strong>
                  <p>{rule.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onStart && (
        <button className="btn btn-primary btn-block" onClick={onStart} style={{ marginTop: 6 }}>
          {startLabel} <ArrowRightIcon size={17} />
        </button>
      )}
    </section>
  );
}
