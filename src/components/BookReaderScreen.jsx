import { useEffect, useMemo, useState } from 'react';
import {
  paginateParagraphs,
  targetWordsForLevel,
  dayForPageIndex,
  CHALLENGE_DAYS,
} from '../lib/pagination.js';
import {
  getBookProgress,
  saveBookProgress,
  logActivity,
  getSetting,
  setSetting,
  modernPageId,
  getModernPage,
  saveModernPage,
} from '../lib/db.js';
import { analyzePageText, modernizePageText, GeminiError } from '../lib/geminiClient.js';
import { copyText } from '../lib/clipboard.js';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  AlertIcon,
  MinusIcon,
  PlusIcon,
  SpeakerIcon,
  CopyIcon,
} from './Icons.jsx';
import BookCover from './BookCover.jsx';
import WordLookupPanel from './WordLookupPanel.jsx';
import NotepadPanel from './NotepadPanel.jsx';

// Splits a paragraph into alternating [text, word, text, word, ...] chunks so
// each word can be rendered as its own clickable span while everything else
// (spaces, punctuation) renders as plain text right next to it — the page
// reads exactly as before, just with tappable words layered on top.
const WORD_PATTERN = /([A-Za-z][A-Za-z'’-]*)/g;
function splitIntoWordChunks(paragraph) {
  return paragraph.split(WORD_PATTERN);
}

// Reading challenges are aimed at learners still building stamina, so
// text size defaults a step larger than the rest of the UI and can be
// bumped up further — a big, easy-to-track line is one less obstacle
// between a beginner and finishing the page.
// Absolute rem sizes (not multipliers) — step 0 matches .book-page's
// default 1.06rem exactly, then steps up for easier reading.
const FONT_SCALES = [1.06, 1.22, 1.38, 1.54];
const AVERAGE_READING_WPM = 130; // conservative pace, comfortable for beginners

/**
 * In-app reader for one Library book. Chapters are flattened into a single
 * page list (see lib/pagination.js) so navigation is just "next/previous
 * page" regardless of chapter boundaries, with a chapter picker for
 * jumping around. "Analyze this page" sends the page's plain text straight
 * to Gemini — no photo, no OCR, since we already have the text.
 *
 * Every word on the page is individually tappable: tapping one opens
 * WordLookupPanel, a quick context-aware dictionary lookup that can be
 * starred straight into the Word Book (see WordLookupPanel.jsx), so a
 * learner isn't forced to run a full page analysis just to check one word.
 * NotepadPanel adds a free-text scratchpad per book for jotting down
 * unfamiliar words or thoughts while reading.
 */
export default function BookReaderScreen({
  bookId,
  apiKey,
  readingLevel,
  onBack,
  onAnalyzed,
  onVocabChanged,
}) {
  const [book, setBook] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [flatIndex, setFlatIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');
  const [progress, setProgress] = useState(null);
  const [fontStep, setFontStep] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [modernMode, setModernMode] = useState(false);
  const [modernParagraphs, setModernParagraphs] = useState(null);
  const [modernizing, setModernizing] = useState(false);
  const [modernError, setModernError] = useState('');
  const [lookupTarget, setLookupTarget] = useState(null); // { word, context } | null

  useEffect(() => {
    getSetting('readerFontStep').then((step) => {
      if (typeof step === 'number' && FONT_SCALES[step]) setFontStep(step);
    });
    // Off by default: switching it on calls Gemini, so a learner should
    // choose that per session rather than have a past "on" silently start
    // spending API calls the moment a book is opened.
    getSetting('readerModernMode').then((v) => setModernMode(Boolean(v)));
  }, []);

  const toggleModernMode = () => {
    const next = !modernMode;
    setModernMode(next);
    setSetting('readerModernMode', next).catch(() => {});
  };

  const changeFontStep = (delta) => {
    const next = Math.max(0, Math.min(FONT_SCALES.length - 1, fontStep + delta));
    setFontStep(next);
    setSetting('readerFontStep', next).catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}books/${bookId}.json`).then((r) => {
        if (!r.ok) throw new Error('book fetch failed');
        return r.json();
      }),
      getBookProgress(bookId),
    ])
      .then(([bookData, prog]) => {
        if (!alive) return;
        setBook(bookData);
        setProgress(
          prog || {
            bookId,
            completedChapterIndices: [],
            bookCompleted: false,
          }
        );
      })
      .catch(() => {
        if (alive) setError('Could not load this book. Please try again.');
      });
    return () => {
      alive = false;
    };
  }, [bookId]);

  // Pagination always follows the original text, regardless of modernMode
  // — the modern rewrite is a per-page overlay fetched on demand (see the
  // effect below), not a separately-paginated alternate text. That keeps
  // page numbers, "Day X of N", and saved reading position identical in
  // both modes, so switching mid-book never jumps the reader around.
  const flatPages = useMemo(() => {
    if (!book) return [];
    const targetWords = targetWordsForLevel(book.level);
    const pages = [];
    book.chapters.forEach((chapter, chapterIndex) => {
      const chapterPages = paginateParagraphs(chapter.paragraphs, targetWords);
      chapterPages.forEach((page, pageIndexInChapter) => {
        pages.push({
          chapterIndex,
          chapterTitle: chapter.title,
          pageIndexInChapter,
          pageCountInChapter: chapterPages.length,
          paragraphs: page.paragraphs,
          wordCount: page.wordCount,
        });
      });
    });
    return pages;
  }, [book]);

  // Resume from saved progress once pages are known.
  useEffect(() => {
    if (flatPages.length === 0 || !progress) return;
    if (typeof progress.flatIndex === 'number') {
      setFlatIndex(Math.min(progress.flatIndex, flatPages.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatPages.length]);

  // Listening support: if a narration file exists for the current chapter
  // (see README "듣기 파일 추가하기" — public/audio/<bookId>/ch<N>.mp3, 1-based),
  // show a player so learners who'd rather listen than read can still
  // follow along and check in as "들었어요" from the Home screen.
  const currentChapterIndex = flatPages[flatIndex]?.chapterIndex;
  useEffect(() => {
    if (currentChapterIndex == null) {
      setAudioSrc(null);
      return;
    }
    const src = `${import.meta.env.BASE_URL}audio/${bookId}/ch${currentChapterIndex + 1}.mp3`;
    let alive = true;
    fetch(src, { method: 'HEAD' })
      .then((r) => alive && setAudioSrc(r.ok ? src : null))
      .catch(() => alive && setAudioSrc(null));
    return () => {
      alive = false;
    };
  }, [bookId, currentChapterIndex]);

  // "현대식 영어" is generated one page at a time, on demand, the moment a
  // learner asks for it — never the whole book up front. A device-local
  // cache (db.js's modernPages store) means flipping back to a page
  // already rewritten once costs no further API calls.
  useEffect(() => {
    setModernError('');
    if (!modernMode || book?.bible || book?.noModernize) {
      setModernParagraphs(null);
      return;
    }
    const page = flatPages[flatIndex];
    if (!page) return;
    const id = modernPageId(bookId, page.chapterIndex, page.pageIndexInChapter);
    let alive = true;
    setModernParagraphs(null);
    getModernPage(id)
      .then((cached) => {
        if (!alive) return undefined;
        if (cached) {
          setModernParagraphs(cached.paragraphs);
          return undefined;
        }
        setModernizing(true);
        return modernizePageText(apiKey, page.paragraphs, { level: readingLevel }).then((rewritten) => {
          if (!alive) return;
          setModernParagraphs(rewritten);
          saveModernPage(id, rewritten).catch(() => {});
        });
      })
      .catch((err) => {
        if (!alive) return;
        setModernError(
          err instanceof GeminiError ? err.message : '현대식 영어로 바꾸지 못했어요. 다시 시도해주세요.'
        );
      })
      .finally(() => {
        if (alive) setModernizing(false);
      });
    return () => {
      alive = false;
    };
  }, [modernMode, book, bookId, apiKey, readingLevel, flatIndex, flatPages]);

  if (error) {
    return (
      <section>
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> Back to Library
        </button>
        <div className="error-box">
          <AlertIcon size={17} />
          <span>{error}</span>
        </div>
      </section>
    );
  }

  if (!book || flatPages.length === 0) {
    return (
      <section>
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> Back to Library
        </button>
        <div className="card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line w-80" />
          <div className="skeleton skeleton-line w-60" />
        </div>
      </section>
    );
  }

  const current = flatPages[flatIndex];
  // The Bible books are already modern English (WEB), and the "Great
  // Lines from the Classics" quote library exists specifically to quote
  // its lines verbatim — rewriting either would defeat the point, so the
  // toggle doesn't offer to.
  const modernAllowed = !book.bible && !book.noModernize;
  // Whichever text is actually on screen right now — the modern rewrite
  // once it's ready, the original while it's still loading or off. Reading,
  // analyzing, and printing all follow this rather than current.paragraphs
  // directly, so they never disagree with what the learner is looking at.
  const showingModern = modernAllowed && modernMode && Boolean(modernParagraphs) && !modernizing;
  const displayParagraphs = showingModern ? modernParagraphs : current.paragraphs;
  const isLastPageOverall = flatIndex === flatPages.length - 1;
  const isLastPageOfChapter =
    flatIndex === flatPages.length - 1 ||
    flatPages[flatIndex + 1].chapterIndex !== current.chapterIndex;

  const persistProgress = (nextFlatIndex, { completeChapter, completeBook } = {}) => {
    const next = { ...progress };
    next.bookId = bookId;
    next.flatIndex = nextFlatIndex;
    next.chapterIndex = flatPages[nextFlatIndex].chapterIndex;
    next.pageIndexInChapter = flatPages[nextFlatIndex].pageIndexInChapter;
    next.bookTitle = book.title;
    next.totalChapters = book.chapters.length;
    next.completedChapterIndices = [...(progress.completedChapterIndices || [])];
    if (completeChapter && !next.completedChapterIndices.includes(current.chapterIndex)) {
      next.completedChapterIndices.push(current.chapterIndex);
    }
    if (completeBook) next.bookCompleted = true;
    next.updatedAt = new Date().toISOString();
    if (!next.startedAt) next.startedAt = new Date().toISOString();
    setProgress(next);
    saveBookProgress(next).catch(() => {});
  };

  const goNext = () => {
    if (isLastPageOverall) return;
    persistProgress(flatIndex + 1, {
      completeChapter: isLastPageOfChapter,
      completeBook: false,
    });
    setFlatIndex(flatIndex + 1);
    setCopyStatus('');
    setLookupTarget(null);
  };

  const goPrev = () => {
    if (flatIndex === 0) return;
    persistProgress(flatIndex - 1);
    setFlatIndex(flatIndex - 1);
    setCopyStatus('');
    setLookupTarget(null);
  };

  // Copies exactly what's on screen — the current page's paragraphs (verse
  // numbers included, for the Bible books) — so a learner can paste a
  // passage into a dictionary, notes app, or chat without retyping it.
  const handleCopyPage = async () => {
    const ok = await copyText(current.paragraphs.join('\n\n'));
    setCopyStatus(ok ? '이 페이지를 복사했어요.' : '복사에 실패했어요. 직접 선택해서 복사해주세요.');
  };

  const jumpToChapter = (chapterIndex) => {
    const target = flatPages.findIndex((p) => p.chapterIndex === Number(chapterIndex));
    if (target !== -1) {
      persistProgress(target);
      setFlatIndex(target);
      setCopyStatus('');
      setLookupTarget(null);
    }
  };

  const handleWordClick = (word, context) => {
    setLookupTarget({ word, context });
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzeError('');
    setAnalyzing(true);
    setStatus('Sending the page to Gemini…');
    try {
      const pageText = displayParagraphs.join('\n\n');
      const guide = await analyzePageText(apiKey, pageText, {
        level: readingLevel,
        onStatus: setStatus,
      });
      await logActivity({
        source: 'library',
        bookId,
        bookTitle: book.title,
        chapterTitle: current.chapterTitle,
        pageIndex: flatIndex,
        wordCount: current.wordCount,
      });
      if (isLastPageOverall) {
        persistProgress(flatIndex, { completeChapter: true, completeBook: true });
      }
      onAnalyzed(guide, {
        backLabel: 'Back to reader',
        onBackToSource: onBack,
        source: {
          type: 'library',
          paragraphs: displayParagraphs,
          bookTitle: book.title,
          chapterTitle: current.chapterTitle,
        },
      });
    } catch (err) {
      if (err instanceof GeminiError) setAnalyzeError(err.message);
      else setAnalyzeError('Something unexpected went wrong. Please try again.');
    } finally {
      setAnalyzing(false);
      setStatus('');
    }
  };

  if (analyzing) {
    return (
      <section>
        <p className="loading-status">
          <span className="spinner" aria-hidden="true" />
          {status || 'Working on your study guide…'}
        </p>
        <div className="card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line w-80" />
          <div className="skeleton skeleton-line w-60" />
        </div>
      </section>
    );
  }

  return (
    <section>
      <button className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={16} /> Back to Library
      </button>

      <div className="reader-head">
        <BookCover bookId={bookId} size="sm" />
        <div className="reader-head-body">
          <h2 className="reader-title">{book.title}</h2>
          <select
            className="reader-chapter-select"
            value={current.chapterIndex}
            onChange={(e) => jumpToChapter(e.target.value)}
            aria-label="Jump to chapter"
          >
            {book.chapters.map((ch, i) => (
              <option key={i} value={i}>
                {ch.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {book.level === 'Beginner' && (
        <div className="notice beginner-tip">
          <SparklesIcon size={16} />
          <span>
            초보자 팁: 모르는 단어가 나와도 괜찮아요! 문장 전체 느낌을 먼저
            파악하고, 별표로 저장해서 나중에 복습하세요.
          </span>
        </div>
      )}

      {modernAllowed && (
        <div className="mode-toggle" role="group" aria-label="원문 또는 현대식 영어로 읽기">
          <button
            type="button"
            className={`mode-toggle-btn ${!modernMode ? 'active' : ''}`}
            onClick={() => modernMode && toggleModernMode()}
          >
            📜 원문 그대로
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${modernMode ? 'active' : ''}`}
            onClick={() => !modernMode && toggleModernMode()}
          >
            ✨ 현대식 영어
          </button>
        </div>
      )}
      {modernAllowed && modernMode && modernizing && (
        <p className="loading-status small">
          <span className="spinner" aria-hidden="true" />이 페이지를 현대식 영어로 바꾸는 중…
        </p>
      )}
      {modernAllowed && modernMode && modernError && (
        <div className="error-box">
          <AlertIcon size={17} />
          <span>{modernError}</span>
          <button className="btn btn-sm" onClick={() => toggleModernMode()}>
            원문으로 보기
          </button>
        </div>
      )}

      {audioSrc && (
        <div className="audio-player-card">
          <SpeakerIcon size={17} />
          <div className="audio-player-body">
            <strong>이 챕터 듣기</strong>
            <span className="muted small">
              읽기가 부담스러우면 들어도 챌린지 인증에 인정돼요. 다 들었으면 홈
              화면에서 &quot;들었어요&quot;로 인증하세요.
            </span>
            <audio controls src={audioSrc} style={{ width: '100%', marginTop: 6 }} />
          </div>
        </div>
      )}

      <div className="reader-toolbar">
        <span className="reading-time">
          ~{Math.max(1, Math.round(current.wordCount / AVERAGE_READING_WPM))} min read
        </span>
        <div className="font-size-control">
          <button
            className="icon-button"
            onClick={() => changeFontStep(-1)}
            disabled={fontStep === 0}
            aria-label="Decrease text size"
            title="Decrease text size"
          >
            <MinusIcon size={15} />
          </button>
          <span className="font-size-label" aria-hidden="true">
            A
          </span>
          <button
            className="icon-button"
            onClick={() => changeFontStep(1)}
            disabled={fontStep === FONT_SCALES.length - 1}
            aria-label="Increase text size"
            title="Increase text size"
          >
            <PlusIcon size={15} />
          </button>
        </div>
        <button
          className="icon-button"
          onClick={handleCopyPage}
          aria-label="Copy this page's text"
          title="이 페이지 원문 복사"
        >
          <CopyIcon size={15} />
        </button>
      </div>
      {copyStatus && <p className="muted small copy-status">{copyStatus}</p>}

      <div className="book-page" style={{ fontSize: `${FONT_SCALES[fontStep]}rem` }}>
        {displayParagraphs.map((p, i) => (
          <p key={i}>
            {splitIntoWordChunks(p).map((chunk, j) =>
              j % 2 === 1 ? (
                <span
                  key={j}
                  className="lookup-word"
                  onClick={() => handleWordClick(chunk, p)}
                  title="탭해서 뜻 찾기"
                >
                  {chunk}
                </span>
              ) : (
                chunk
              )
            )}
          </p>
        ))}
      </div>
      <p className="muted small lookup-hint">단어를 탭하면 이 문장 속 뜻을 바로 찾아줘요.</p>

      {lookupTarget && (
        <WordLookupPanel
          key={`${lookupTarget.word}-${flatIndex}`}
          apiKey={apiKey}
          readingLevel={readingLevel}
          word={lookupTarget.word}
          context={lookupTarget.context}
          onClose={() => setLookupTarget(null)}
          onVocabChanged={onVocabChanged}
        />
      )}

      <p className="reader-page-count">
        Page {current.pageIndexInChapter + 1} of {current.pageCountInChapter} in this chapter
        {' · '}
        Day {dayForPageIndex(flatIndex, flatPages.length)} of {CHALLENGE_DAYS}
        {showingModern && (
          <>
            {' · '}
            <span title="AI가 원작을 현대식 영어로 다시 쓴 버전입니다">✨ AI 현대식 영어</span>
          </>
        )}
      </p>

      <div className="reader-nav">
        <button className="btn" onClick={goPrev} disabled={flatIndex === 0}>
          <ChevronLeftIcon size={17} /> Previous
        </button>
        <button className="btn" onClick={goNext} disabled={isLastPageOverall}>
          Next <ChevronRightIcon size={17} />
        </button>
      </div>

      <button className="btn btn-primary btn-block" onClick={handleAnalyze} style={{ marginTop: 14 }}>
        <SparklesIcon size={17} /> Analyze this page
      </button>

      <NotepadPanel bookId={bookId} />

      {analyzeError && (
        <div className="error-box">
          <AlertIcon size={17} />
          <span>{analyzeError}</span>
        </div>
      )}

      {isLastPageOverall && (
        <p className="muted small" style={{ textAlign: 'center', marginTop: 14 }}>
          🎉 You've reached the last page of this book.
        </p>
      )}
    </section>
  );
}
