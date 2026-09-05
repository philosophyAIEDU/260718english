import { useEffect, useState } from 'react';
import {
  getSetting,
  setSetting,
  logActivity,
  getAllActivity,
  getAllVocab,
  getAllBookProgress,
} from '../lib/db.js';
import { isActiveToday } from '../lib/streaks.js';
import { computeStats } from '../lib/statsUtils.js';
import { renderProgressCard, shareOrDownloadCard } from '../lib/progressCard.js';
import { CHALLENGE_CONFIG, CURRICULUM } from '../lib/challengeConfig.js';
import { challengeProgress, today } from '../lib/challengeUtils.js';
import ChallengeCheckin from './ChallengeCheckin.jsx';
import {
  CameraIcon,
  LibraryIcon,
  BellIcon,
  FlameIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  CheckSquareIcon,
  ShareIcon,
  AlertIcon,
  BranchIcon,
  SparklesIcon,
} from './Icons.jsx';

/**
 * Home is the challenge dashboard. Top to bottom it answers the three
 * questions a participant opens the app with: where are we in the month,
 * have I certified today, and what am I building this week — then the two
 * ways to actually read (Library or a photo of your own book).
 */
export default function HomeScreen({
  streak,
  dueCount,
  onScan,
  onLibrary,
  onReview,
  onProgress,
  onCheckinComplete,
  onOpenIntro,
  onOpenClass,
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  const progress = challengeProgress(today());
  const thisWeekClass = CURRICULUM.find((c) => c.week === progress.week);

  useEffect(() => {
    // Collapsed by default for a clean, uncluttered first impression; the
    // learner can expand the how-to whenever they want. Only a previously
    // stored preference of "open" (false) re-opens it.
    getSetting('homeGuideCollapsed').then((collapsed) => {
      setGuideOpen(collapsed === false);
      setGuideReady(true);
    });
  }, []);

  const toggleGuide = () => {
    const next = !guideOpen;
    setGuideOpen(next);
    if (guideReady) setSetting('homeGuideCollapsed', !next).catch(() => {});
  };

  const handleCheckinAndShare = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    setCheckinMessage('');
    try {
      const before = await getAllActivity();
      if (!isActiveToday(before.map((a) => a.date))) {
        await logActivity({ source: 'checkin' });
      }
      onCheckinComplete?.();

      const [activity, vocab, bookProgress, theme] = await Promise.all([
        getAllActivity(),
        getAllVocab(),
        getAllBookProgress(),
        getSetting('theme'),
      ]);
      const stats = computeStats({ activity, vocab, bookProgress });
      const currentBook = bookProgress
        .filter((b) => !b.bookCompleted)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
      const blob = await renderProgressCard({
        streak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        vocabCount: stats.vocabCount,
        booksCompleted: stats.booksCompleted,
        bookTitle: currentBook?.bookTitle,
        chapterTitle: currentBook ? `Chapter ${currentBook.chapterIndex + 1}` : '',
        theme: theme || 'light',
      });
      const result = await shareOrDownloadCard(blob, 'read-and-build-progress.png');
      setCheckinMessage(
        result === 'shared'
          ? '공유 완료! 오늘도 수고했어요.'
          : result === 'downloaded'
          ? '이미지가 저장됐어요 — 챌린지 방에 공유해보세요!'
          : ''
      );
    } catch {
      setCheckinMessage('이미지를 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <section>
      <div className="hero">
        <p className="hero-eyebrow">
          <SparklesIcon size={13} /> {CHALLENGE_CONFIG.title}
        </p>

        {progress.phase === 'running' ? (
          <>
            <div className="hero-day">
              <strong>{progress.day}</strong>
              <span>
                / {progress.totalDays}일차 · {progress.week}주차
              </span>
            </div>
            <div className="hero-progress">
              <div className="hero-progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
          </>
        ) : progress.phase === 'before' ? (
          <>
            <div className="hero-day">
              <strong>D-{progress.daysUntilStart}</strong>
              <span>{CHALLENGE_CONFIG.startDate} 시작</span>
            </div>
            <p className="hero-lead">{CHALLENGE_CONFIG.tagline}</p>
          </>
        ) : (
          <>
            <h1 className="hero-title" style={{ fontSize: '1.35rem' }}>
              챌린지가 끝났어요 🎉
            </h1>
            <p className="hero-lead">한 달간 정말 수고 많으셨습니다.</p>
          </>
        )}

        {/* Before the challenge opens there's no streak or progress to show
            yet, so the stats introduce the program's shape instead. */}
        {progress.phase === 'before' ? (
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{progress.totalDays}일</strong>
              <span>주 7일 인증</span>
            </div>
            <div className="hero-stat">
              <strong>{CURRICULUM.length}회</strong>
              <span>앱 빌드 수업</span>
            </div>
            <div className="hero-stat">
              <strong>{CHALLENGE_CONFIG.kickoutThreshold}회</strong>
              <span>미인증 시 킥아웃</span>
            </div>
          </div>
        ) : (
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{streak}</strong>
              <span>연속 학습일</span>
            </div>
            <div className="hero-stat">
              <strong>{progress.daysLeft}</strong>
              <span>남은 날</span>
            </div>
            <div className="hero-stat">
              <strong>{dueCount}</strong>
              <span>복습할 단어</span>
            </div>
          </div>
        )}
      </div>

      <ChallengeCheckin />

      {thisWeekClass && (
        <button className="class-banner" onClick={onOpenClass}>
          <span className="banner-icon">
            <BranchIcon size={19} />
          </span>
          <span className="class-banner-body">
            <span className="class-banner-week">이번 주 수업 · {thisWeekClass.week}주차</span>
            <span className="class-banner-title">{thisWeekClass.title}</span>
          </span>
          <ArrowRightIcon size={17} />
        </button>
      )}

      {dueCount > 0 && (
        <button className="review-banner" onClick={onReview}>
          <span className="banner-icon">
            <BellIcon size={19} />
          </span>
          <span className="banner-body">
            <strong>
              오늘의 복습: {dueCount}단어
            </strong>
            <span className="banner-sub">저장한 단어를 다시 만나볼 시간이에요</span>
          </span>
          <span className="banner-arrow">
            <ArrowLeftIcon size={18} />
          </span>
        </button>
      )}

      {streak > 0 && (
        <button className="review-banner streak-banner" onClick={onProgress}>
          <span className="banner-icon streak-icon">
            <FlameIcon size={19} />
          </span>
          <span className="banner-body">
            <strong>{streak}일 연속 학습 중</strong>
            <span className="banner-sub">기록과 뱃지 보러 가기</span>
          </span>
          <span className="banner-arrow">
            <ArrowLeftIcon size={18} />
          </span>
        </button>
      )}

      <div className="section-head">
        <span className="eyebrow">오늘의 학습</span>
        <h2>읽거나, 들으세요</h2>
        <p>
          읽기가 부담스러우면 라이브러리에서 듣기 파일을 재생해도 인증으로
          인정됩니다.
        </p>
      </div>
      <div className="entry-grid">
        <button className="entry-card entry-card-alt" onClick={onLibrary}>
          <span className="entry-card-icon entry-card-icon-alt">
            <LibraryIcon size={26} />
          </span>
          <strong>라이브러리 읽기</strong>
          <span className="small muted">무료 영어 원서 12권 · 영어 성경 6권 · 명대사 30편 · 듣기 지원</span>
        </button>
        <button className="entry-card" onClick={onScan}>
          <span className="entry-card-icon">
            <CameraIcon size={26} />
          </span>
          <strong>내 책 찍기</strong>
          <span className="small muted">읽고 있는 책 페이지를 사진으로</span>
        </button>
      </div>

      <div className="checkin-card">
        <button
          className="btn btn-block"
          onClick={handleCheckinAndShare}
          disabled={checkingIn}
        >
          <CheckSquareIcon size={17} />
          {checkingIn ? '만드는 중…' : '오늘 학습 인증 이미지 만들기'}
          <ShareIcon size={15} />
        </button>
        <p className="muted small checkin-hint">
          챌린지 방에 올릴 인증 이미지를 만들어요. (공식 인증은 위의 &quot;오늘
          인증하기&quot;로 해주세요)
        </p>
        {checkinMessage && (
          <p className="small share-message">
            {checkinMessage.startsWith('이미지를 만들지') ? (
              <AlertIcon size={14} />
            ) : (
              <CheckSquareIcon size={14} />
            )}{' '}
            {checkinMessage}
          </p>
        )}
      </div>

      <div className={`guide-card ${guideOpen ? 'open' : ''}`}>
        <button className="guide-header" onClick={toggleGuide} aria-expanded={guideOpen}>
          <span className="guide-header-left">
            <HelpCircleIcon size={18} />
            <strong>앱 이용 방법</strong>
          </span>
          <span className="accordion-chevron">
            <ChevronDownIcon size={18} />
          </span>
        </button>
        {guideOpen && (
          <div className="guide-body">
            <ol className="guide-steps">
              <li>
                <strong>읽거나 듣기</strong> — <em>라이브러리</em>에서 원서를 골라
                읽거나, 챕터 듣기 파일을 재생하세요. 내가 읽는 종이책은{' '}
                <em>내 책 찍기</em>로 사진을 찍으면 됩니다.
              </li>
              <li>
                <strong>AI 학습 가이드 받기</strong> — “Analyze this page”를 누르면
                요약·핵심 단어·문장 분석·이해도 질문이 100% 영어로 만들어져요.
              </li>
              <li>
                <strong>단어 저장하고 복습하기</strong> — 별표(⭐)로 저장한 단어는
                1일 → 3일 → 7일 → 14일 간격으로 Review 탭에 다시 나타납니다.
              </li>
              <li>
                <strong>매일 인증하기</strong> — 홈 화면의 “오늘 인증하기”로 읽기
                또는 듣기를 인증하세요. 주 7일, 미인증 {CHALLENGE_CONFIG.kickoutThreshold}
                회가 되면 킥아웃 대상이 됩니다.
              </li>
              <li>
                <strong>주 1회 앱 빌드 수업</strong> — 이번 주 수업에서 무엇을
                만드는지는 홈의 수업 배너에서 확인하세요.
              </li>
            </ol>
            <p className="muted small" style={{ marginBottom: 0 }}>
              API 키와 학습 기록은 이 기기에만 저장되고, 인증 기록만 챌린지
              운영을 위해 저장됩니다.
            </p>
          </div>
        )}
      </div>

      <div className="quiet-links">
        <button className="quiet-link" onClick={onOpenIntro}>
          <HelpCircleIcon size={15} /> 챌린지 안내 · 규칙
        </button>
        <button className="quiet-link" onClick={onOpenClass}>
          <BranchIcon size={15} /> {CURRICULUM.length}주 커리큘럼
        </button>
      </div>
    </section>
  );
}
