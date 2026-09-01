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
import ChallengeCheckin from './ChallengeCheckin.jsx';
import {
  CameraIcon,
  LibraryIcon,
  BellIcon,
  FlameIcon,
  ArrowLeftIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  CheckSquareIcon,
  ShareIcon,
  AlertIcon,
} from './Icons.jsx';

/**
 * Home hub: the reading-challenge entry point. Shows a Korean "how to use"
 * guide (app chrome, not learning content — the study material itself stays
 * 100% English), the streak and due-review nudges, then two ways to start
 * a page: scan a photo of a physical book, or open a built-in public-domain
 * book from the Library.
 */
export default function HomeScreen({
  streak,
  dueCount,
  onScan,
  onLibrary,
  onReview,
  onProgress,
  onCheckinComplete,
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');

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
      const result = await shareOrDownloadCard(blob, 'readmate-progress.png');
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
      <div className="home-welcome">
        <h2>오늘도 영어 원서 한 페이지 📖</h2>
        <p className="muted small">
          부담 갖지 말고 딱 한 페이지씩. 매일 조금씩 읽으면 어느새 한 권을
          끝내게 돼요.
        </p>
      </div>

      <div className={`guide-card ${guideOpen ? 'open' : ''}`}>
        <button className="guide-header" onClick={toggleGuide} aria-expanded={guideOpen}>
          <span className="guide-header-left">
            <HelpCircleIcon size={18} />
            <strong>Read &amp; Build 이용 방법</strong>
          </span>
          <span className="accordion-chevron">
            <ChevronDownIcon size={18} />
          </span>
        </button>
        {guideOpen && (
          <div className="guide-body">
            <p className="muted small" style={{ marginTop: 0 }}>
              영어 원문 읽기 챌린지에 오신 것을 환영해요! 아래 순서대로 따라 하면 됩니다.
            </p>
            <ol className="guide-steps">
              <li>
                <strong>읽을 페이지 정하기</strong> — 내가 읽는 책 한 페이지를{' '}
                <em>Scan a Page</em>로 사진 찍거나, <em>Read the Library</em>에서
                무료 고전 영어 원서를 골라 읽으세요.
              </li>
              <li>
                <strong>AI 학습 가이드 받기</strong> — “Analyze this page” 버튼을
                누르면 요약, 핵심 단어, 문장 분석, 이해도 질문이 100% 영어로
                만들어져요. (몰입 학습을 위해 학습 내용은 항상 영어로만
                제공됩니다.)
              </li>
              <li>
                <strong>단어 저장하기</strong> — 모르는 단어의 별표(⭐)를 누르면
                내 단어장(Word Book)에 저장돼요. 스피커 아이콘을 누르면 발음도
                들을 수 있어요.
              </li>
              <li>
                <strong>복습하기</strong> — 저장한 단어는 1일 → 3일 → 7일 → 14일
                간격으로 Review 탭에 자동으로 다시 나타나요. 카드를 뒤집어 뜻을
                확인하고 Easy/Good/Hard로 평가하세요.
              </li>
              <li>
                <strong>챌린지 진행상황 확인 & 공유</strong> — Progress 탭에서
                연속 학습일(스트릭)과 뱃지를 확인하고, “Share my progress”로
                챌린지 인증 이미지를 만들어 친구들과 공유해보세요.
              </li>
              <li>
                <strong>단어장 함께 쓰기</strong> — Word Book의 “Share Deck”으로
                내 단어 목록을 파일로 내보내면, 챌린지 멤버가 “Import Deck”으로
                가져와 같은 단어를 함께 복습할 수 있어요.
              </li>
            </ol>
            <p className="muted small" style={{ marginBottom: 0 }}>
              API 키와 학습 데이터는 이 기기에만 저장되며, 외부 서버로 전송되지
              않아요.
            </p>
          </div>
        )}
      </div>

      <ChallengeCheckin />

      {streak > 0 && (
        <button className="review-banner streak-banner" onClick={onProgress}>
          <span className="banner-icon streak-icon">
            <FlameIcon size={19} />
          </span>
          <span className="banner-body">
            <strong>{streak} day{streak === 1 ? '' : 's'} reading streak</strong>
            <span className="banner-sub">See your progress and badges</span>
          </span>
          <span className="banner-arrow">
            <ArrowLeftIcon size={18} />
          </span>
        </button>
      )}

      {dueCount > 0 && (
        <button className="review-banner" onClick={onReview}>
          <span className="banner-icon">
            <BellIcon size={19} />
          </span>
          <span className="banner-body">
            <strong>
              Today&apos;s Review: {dueCount} {dueCount === 1 ? 'word' : 'words'}
            </strong>
            <span className="banner-sub">Keep your streak going</span>
          </span>
          <span className="banner-arrow">
            <ArrowLeftIcon size={18} />
          </span>
        </button>
      )}

      <div className="entry-grid">
        <button className="entry-card entry-card-alt" onClick={onLibrary}>
          <span className="entry-card-icon entry-card-icon-alt">
            <LibraryIcon size={26} />
          </span>
          <strong>라이브러리 읽기</strong>
          <span className="small muted">무료 영어 원서 12권 · 바로 시작</span>
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
          {checkingIn ? '만드는 중…' : '오늘 학습 완료 체크 & 공유'}
          <ShareIcon size={15} />
        </button>
        <p className="muted small checkin-hint">
          오늘 읽은 것을 체크하면 챌린지 인증 이미지가 만들어져요. 바로
          저장하거나 공유할 수 있어요.
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
    </section>
  );
}
