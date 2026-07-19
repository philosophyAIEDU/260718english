import { useState } from 'react';
import { LEVEL_TEST_QUESTIONS, scoreAnswers } from '../lib/levelTest.js';
import { setSetting } from '../lib/db.js';
import { ArrowLeftIcon, TrophyIcon, LibraryIcon } from './Icons.jsx';

const LEVEL_BLURB = {
  Beginner:
    '짧고 명확한 문장의 책부터 시작해보세요. 학습 가이드의 단어 설명도 쉬운 표현 위주로 제공돼요.',
  Intermediate:
    '탐정 소설이나 모험 이야기처럼 줄거리가 있는 책이 잘 맞아요. 조금 더 풍부한 어휘 설명을 받아볼 수 있어요.',
  Advanced:
    '문학적인 문장과 사회적 뉘앙스가 있는 고전 소설에 도전해보세요. 학습 가이드도 더 정교한 어휘와 분석을 제공해요.',
};

/**
 * A short, offline English placement quiz (see lib/levelTest.js). The
 * result is saved as a setting and used to (a) recommend a Library level
 * and (b) tune the Gemini system prompt's vocabulary/explanation depth.
 */
export default function LevelTestScreen({ onBack, onGoToLibrary }) {
  const [answers, setAnswers] = useState(() => Array(LEVEL_TEST_QUESTIONS.length).fill(null));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectAnswer = (optionIndex) => {
    const next = [...answers];
    next[index] = optionIndex;
    setAnswers(next);
  };

  const goNext = async () => {
    if (index < LEVEL_TEST_QUESTIONS.length - 1) {
      setIndex(index + 1);
      return;
    }
    const scored = scoreAnswers(answers);
    setSaving(true);
    try {
      await setSetting('readingLevel', scored.level);
    } finally {
      setSaving(false);
    }
    setResult(scored);
  };

  const goBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (result) {
    return (
      <section>
        <div className="empty-state">
          <div className="empty-icon-ring">
            <TrophyIcon size={30} />
          </div>
          <h3>당신의 레벨은 {result.level}입니다</h3>
          <p>
            6문제 중 {result.correctCount}개를 맞혔어요. {LEVEL_BLURB[result.level]}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={onGoToLibrary}>
              <LibraryIcon size={16} /> 맞는 책 보러 가기
            </button>
            <button className="btn" onClick={onBack}>
              완료
            </button>
          </div>
        </div>
      </section>
    );
  }

  const q = LEVEL_TEST_QUESTIONS[index];
  const progress = (index / LEVEL_TEST_QUESTIONS.length) * 100;

  return (
    <section>
      <button className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={16} /> 설정으로
      </button>

      <div className="screen-heading">
        <h2>영어 레벨 테스트</h2>
        <span className="count">
          {index + 1} / {LEVEL_TEST_QUESTIONS.length}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="card">
        <p className="summary-text" style={{ marginBottom: 18 }}>
          {q.prompt}
        </p>
        <div className="level-test-options">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`level-test-option ${answers[index] === i ? 'selected' : ''}`}
              onClick={() => selectAnswer(i)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="reader-nav">
        <button className="btn" onClick={goBack} disabled={index === 0}>
          이전
        </button>
        <button
          className="btn btn-primary"
          onClick={goNext}
          disabled={answers[index] === null || saving}
        >
          {index === LEVEL_TEST_QUESTIONS.length - 1 ? '결과 보기' : '다음'}
        </button>
      </div>
    </section>
  );
}
