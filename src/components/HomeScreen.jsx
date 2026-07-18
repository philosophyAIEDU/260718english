import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '../lib/db.js';
import {
  CameraIcon,
  LibraryIcon,
  BellIcon,
  FlameIcon,
  ArrowLeftIcon,
  HelpCircleIcon,
  ChevronDownIcon,
} from './Icons.jsx';

/**
 * Home hub: the reading-challenge entry point. Shows a Korean "how to use"
 * guide (app chrome, not learning content — the study material itself stays
 * 100% English), the streak and due-review nudges, then two ways to start
 * a page: scan a photo of a physical book, or open a built-in public-domain
 * book from the Library.
 */
export default function HomeScreen({ streak, dueCount, onScan, onLibrary, onReview, onProgress }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideReady, setGuideReady] = useState(false);

  useEffect(() => {
    getSetting('homeGuideCollapsed').then((collapsed) => {
      setGuideOpen(!collapsed); // never set -> undefined -> open by default
      setGuideReady(true);
    });
  }, []);

  const toggleGuide = () => {
    const next = !guideOpen;
    setGuideOpen(next);
    if (guideReady) setSetting('homeGuideCollapsed', !next).catch(() => {});
  };

  return (
    <section>
      <div className={`guide-card ${guideOpen ? 'open' : ''}`}>
        <button className="guide-header" onClick={toggleGuide} aria-expanded={guideOpen}>
          <span className="guide-header-left">
            <HelpCircleIcon size={18} />
            <strong>ReadMate 이용 방법</strong>
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
        <button className="entry-card" onClick={onScan}>
          <span className="entry-card-icon">
            <CameraIcon size={26} />
          </span>
          <strong>Scan a Page</strong>
          <span className="small muted">Photograph a page from your own book</span>
        </button>
        <button className="entry-card" onClick={onLibrary}>
          <span className="entry-card-icon entry-card-icon-alt">
            <LibraryIcon size={26} />
          </span>
          <strong>Read the Library</strong>
          <span className="small muted">Classic public-domain novels, built in</span>
        </button>
      </div>

      <p className="upload-tip">
        Fill your day: scan a page from what you're reading, or open a
        Library book for today's challenge page. Either way, your progress
        counts toward your streak.
      </p>
    </section>
  );
}
