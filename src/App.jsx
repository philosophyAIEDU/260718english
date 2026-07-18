import { useCallback, useEffect, useState } from 'react';
import ApiKeyScreen from './components/ApiKeyScreen.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import UploadScreen from './components/UploadScreen.jsx';
import BookLibraryScreen from './components/BookLibraryScreen.jsx';
import BookReaderScreen from './components/BookReaderScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import VocabScreen from './components/VocabScreen.jsx';
import ReviewScreen from './components/ReviewScreen.jsx';
import ProgressScreen from './components/ProgressScreen.jsx';
import {
  BrandMark,
  HomeIcon,
  LibraryIcon,
  CardsIcon,
  TrophyIcon,
  SettingsIcon,
  MoonIcon,
  SunIcon,
  SearchIcon,
} from './components/Icons.jsx';
import { getSetting, setSetting, countDueVocab, getAllActivity } from './lib/db.js';
import { currentStreak } from './lib/streaks.js';

/**
 * App shell: theme handling, lightweight view routing, and the bottom tab
 * bar. Views:
 *   home     — challenge hub: streak/review nudges + Scan/Library entry
 *   scan     — photo upload / analyze (UploadScreen)
 *   library  — built-in public-domain book list
 *   reader   — in-app chapter/page reader for one library book
 *   result   — study guide for the analyzed page (shared by scan & reader)
 *   vocab    — saved word book (VocabScreen)
 *   review   — spaced-repetition flashcards (ReviewScreen)
 *   progress — streak calendar, badges, shareable progress card
 *   settings — API key management (ApiKeyScreen)
 */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('home');
  const [result, setResult] = useState(null);
  const [resultNav, setResultNav] = useState({ backLabel: 'Scan another page', backView: 'home' });
  const [libraryBookId, setLibraryBookId] = useState(null);
  const [dueCount, setDueCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Boot: load persisted settings.
  useEffect(() => {
    (async () => {
      try {
        const [storedKey, storedTheme] = await Promise.all([
          getSetting('geminiApiKey'),
          getSetting('theme'),
        ]);
        if (storedKey) setApiKey(storedKey);
        const prefersDark =
          window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
        setTheme(storedTheme || (prefersDark ? 'dark' : 'light'));
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshChallengeStats = useCallback(() => {
    countDueVocab()
      .then(setDueCount)
      .catch(() => setDueCount(0));
    getAllActivity()
      .then((activity) => setStreak(currentStreak(activity.map((a) => a.date))))
      .catch(() => setStreak(0));
  }, []);

  useEffect(() => {
    if (!booting) refreshChallengeStats();
  }, [booting, view, refreshChallengeStats]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setSetting('theme', next).catch(() => {});
  };

  const handleKeySaved = (key) => {
    setApiKey(key);
    setView('home');
  };

  const handleScanResult = (studyGuide) => {
    setResult(studyGuide);
    setResultNav({ backLabel: 'Scan another page', backView: 'scan' });
    setView('result');
  };

  const handleLibraryResult = (studyGuide, { backLabel, onBackToSource }) => {
    setResult(studyGuide);
    setResultNav({ backLabel, backView: 'reader', onBackToSource });
    setView('result');
  };

  const header = (
    <header className="app-header">
      <div className="app-brand">
        <BrandMark size={34} />
        <div>
          <h1>ReadMate</h1>
          <span className="tagline">Read English, in English</span>
        </div>
      </div>
      <button
        className="icon-button"
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
      </button>
    </header>
  );

  if (booting) {
    return (
      <div className="app-shell">
        <div className="empty-state" style={{ marginTop: 110 }}>
          <div className="empty-icon-ring">
            <BrandMark size={40} />
          </div>
          <h3>ReadMate</h3>
          <p>Opening your reading desk…</p>
        </div>
      </div>
    );
  }

  // First run: no API key yet → the key screen is the whole app.
  if (!apiKey) {
    return (
      <div className="app-shell">
        {header}
        <main>
          <ApiKeyScreen onSaved={handleKeySaved} />
        </main>
      </div>
    );
  }

  return (
    <>
      <div className="app-shell">
        {header}

        <main>
          {view === 'home' && (
            <HomeScreen
              streak={streak}
              dueCount={dueCount}
              onScan={() => setView('scan')}
              onLibrary={() => setView('library')}
              onReview={() => setView('review')}
              onProgress={() => setView('progress')}
            />
          )}

          {view === 'scan' && (
            <UploadScreen apiKey={apiKey} onResult={handleScanResult} />
          )}

          {view === 'library' && (
            <BookLibraryScreen
              onOpenBook={(bookId) => {
                setLibraryBookId(bookId);
                setView('reader');
              }}
              onBack={() => setView('home')}
            />
          )}

          {view === 'reader' && libraryBookId && (
            <BookReaderScreen
              bookId={libraryBookId}
              apiKey={apiKey}
              onBack={() => setView('library')}
              onAnalyzed={handleLibraryResult}
            />
          )}

          {view === 'result' &&
            (result ? (
              <ResultScreen
                result={result}
                backLabel={resultNav.backLabel}
                onBack={() => {
                  if (resultNav.backView === 'reader' && resultNav.onBackToSource) {
                    setView('reader');
                  } else {
                    setView(resultNav.backView || 'home');
                  }
                }}
                onVocabChanged={refreshChallengeStats}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon-ring">
                  <SearchIcon size={30} />
                </div>
                <h3>No page analyzed yet</h3>
                <p>Scan a page or read from the Library to see your study guide here.</p>
                <button className="btn btn-primary" onClick={() => setView('home')}>
                  Go home
                </button>
              </div>
            ))}

          {view === 'vocab' && <VocabScreen onVocabChanged={refreshChallengeStats} />}

          {view === 'review' && (
            <ReviewScreen
              onDone={() => {
                refreshChallengeStats();
                setView('vocab');
              }}
              onVocabChanged={refreshChallengeStats}
            />
          )}

          {view === 'progress' && <ProgressScreen />}

          {view === 'settings' && (
            <ApiKeyScreen existingKey={apiKey} onSaved={handleKeySaved} />
          )}
        </main>
      </div>

      <nav className="tab-bar" aria-label="Main navigation">
        <div className="tab-bar-inner">
          <TabButton
            icon={<HomeIcon size={21} />}
            label="Home"
            active={['home', 'scan', 'library', 'reader', 'result'].includes(view)}
            onClick={() => setView('home')}
          />
          <TabButton
            icon={<LibraryIcon size={21} />}
            label="Word Book"
            active={view === 'vocab'}
            onClick={() => setView('vocab')}
          />
          <TabButton
            icon={<CardsIcon size={21} />}
            label="Review"
            active={view === 'review'}
            badge={dueCount}
            onClick={() => setView('review')}
          />
          <TabButton
            icon={<TrophyIcon size={21} />}
            label="Progress"
            active={view === 'progress'}
            onClick={() => setView('progress')}
          />
          <TabButton
            icon={<SettingsIcon size={21} />}
            label="Settings"
            active={view === 'settings'}
            onClick={() => setView('settings')}
          />
        </div>
      </nav>
    </>
  );
}

function TabButton({ icon, label, active, badge = 0, onClick }) {
  return (
    <button
      className={`tab-button ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      {icon}
      {label}
      {badge > 0 && <span className="tab-badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}
