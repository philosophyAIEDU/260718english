import { useEffect, useMemo, useState } from 'react';
import {
  paginateParagraphs,
  targetWordsForLevel,
  dayForPageIndex,
  CHALLENGE_DAYS,
} from '../lib/pagination.js';
import { getBookProgress, saveBookProgress, logActivity, getSetting, setSetting } from '../lib/db.js';
import { analyzePageText, GeminiError } from '../lib/geminiClient.js';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  AlertIcon,
  MinusIcon,
  PlusIcon,
} from './Icons.jsx';
import BookCover from './BookCover.jsx';

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
 */
export default function BookReaderScreen({ bookId, apiKey, readingLevel, onBack, onAnalyzed }) {
  const [book, setBook] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [flatIndex, setFlatIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [analyzeError, setAnalyzeError] = useState('');
  const [progress, setProgress] = useState(null);
  const [fontStep, setFontStep] = useState(0);

  useEffect(() => {
    getSetting('readerFontStep').then((step) => {
      if (typeof step === 'number' && FONT_SCALES[step]) setFontStep(step);
    });
  }, []);

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
  };

  const goPrev = () => {
    if (flatIndex === 0) return;
    persistProgress(flatIndex - 1);
    setFlatIndex(flatIndex - 1);
  };

  const jumpToChapter = (chapterIndex) => {
    const target = flatPages.findIndex((p) => p.chapterIndex === Number(chapterIndex));
    if (target !== -1) {
      persistProgress(target);
      setFlatIndex(target);
    }
  };

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzeError('');
    setAnalyzing(true);
    setStatus('Sending the page to Gemini…');
    try {
      const pageText = current.paragraphs.join('\n\n');
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
      </div>

      <div className="book-page" style={{ fontSize: `${FONT_SCALES[fontStep]}rem` }}>
        {current.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <p className="reader-page-count">
        Page {current.pageIndexInChapter + 1} of {current.pageCountInChapter} in this chapter
        {' · '}
        Day {dayForPageIndex(flatIndex, flatPages.length)} of {CHALLENGE_DAYS}
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
