import { useCallback, useEffect, useState } from 'react';
import ApiKeyScreen from './components/ApiKeyScreen.jsx';
import UploadScreen from './components/UploadScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import VocabScreen from './components/VocabScreen.jsx';
import ReviewScreen from './components/ReviewScreen.jsx';
import {
  BrandMark,
  CameraIcon,
  LibraryIcon,
  CardsIcon,
  SettingsIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  ArrowLeftIcon,
  SearchIcon,
} from './components/Icons.jsx';
import { getSetting, setSetting, countDueVocab } from './lib/db.js';

/**
 * App shell: theme handling, lightweight view routing, and the bottom tab
 * bar. Views:
 *   home    — photo upload / analyze (UploadScreen)
 *   result  — study guide for the analyzed page (ResultScreen)
 *   vocab   — saved word book (VocabScreen)
 *   review  — spaced-repetition flashcards (ReviewScreen)
 *   settings— API key management (ApiKeyScreen)
 */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('home');
  const [result, setResult] = useState(null);
  const [dueCount, setDueCount] = useState(0);

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

  const refreshDueCount = useCallback(() => {
    countDueVocab()
      .then(setDueCount)
      .catch(() => setDueCount(0));
  }, []);

  useEffect(() => {
    if (!booting) refreshDueCount();
  }, [booting, view, refreshDueCount]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setSetting('theme', next).catch(() => {});
  };

  const handleKeySaved = (key) => {
    setApiKey(key);
    setView('home');
  };

  const handleAnalysisResult = (studyGuide) => {
    setResult(studyGuide);
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
            <>
              {dueCount > 0 && (
                <button className="review-banner" onClick={() => setView('review')}>
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
              <UploadScreen apiKey={apiKey} onResult={handleAnalysisResult} />
            </>
          )}

          {view === 'result' &&
            (result ? (
              <ResultScreen
                result={result}
                onBack={() => setView('home')}
                onVocabChanged={refreshDueCount}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon-ring">
                  <SearchIcon size={30} />
                </div>
                <h3>No page analyzed yet</h3>
                <p>Snap a page on the Scan tab to see your study guide here.</p>
                <button className="btn btn-primary" onClick={() => setView('home')}>
                  Go to Scan
                </button>
              </div>
            ))}

          {view === 'vocab' && <VocabScreen onVocabChanged={refreshDueCount} />}

          {view === 'review' && (
            <ReviewScreen
              onDone={() => {
                refreshDueCount();
                setView('vocab');
              }}
              onVocabChanged={refreshDueCount}
            />
          )}

          {view === 'settings' && (
            <ApiKeyScreen existingKey={apiKey} onSaved={handleKeySaved} />
          )}
        </main>
      </div>

      <nav className="tab-bar" aria-label="Main navigation">
        <div className="tab-bar-inner">
          <TabButton
            icon={<CameraIcon size={21} />}
            label="Scan"
            active={view === 'home' || view === 'result'}
            onClick={() => setView(result && view === 'result' ? 'result' : 'home')}
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
