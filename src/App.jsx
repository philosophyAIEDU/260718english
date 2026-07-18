import { useCallback, useEffect, useState } from 'react';
import ApiKeyScreen from './components/ApiKeyScreen.jsx';
import UploadScreen from './components/UploadScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import VocabScreen from './components/VocabScreen.jsx';
import ReviewScreen from './components/ReviewScreen.jsx';
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

  if (booting) {
    return (
      <div className="app-shell">
        <div className="empty-state" style={{ marginTop: 120 }}>
          <span className="empty-icon">📖</span>
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
        <header className="app-header">
          <div className="app-brand">
            <h1>📖 ReadMate</h1>
            <span className="tagline">read English, in English</span>
          </div>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>
        <ApiKeyScreen onSaved={handleKeySaved} />
      </div>
    );
  }

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-brand">
            <h1>📖 ReadMate</h1>
            <span className="tagline">read English, in English</span>
          </div>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>

        <main>
          {view === 'home' && (
            <>
              {dueCount > 0 && (
                <button className="review-banner" onClick={() => setView('review')}>
                  <span>
                    🔔 <strong>Today&apos;s Review: {dueCount} {dueCount === 1 ? 'word' : 'words'}</strong>{' '}
                    — keep your streak going!
                  </span>
                  <span aria-hidden="true">→</span>
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
                <span className="empty-icon">🔍</span>
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
            icon="📷"
            label="Scan"
            active={view === 'home' || view === 'result'}
            onClick={() => setView(result && view === 'result' ? 'result' : 'home')}
          />
          <TabButton
            icon="📚"
            label="Word Book"
            active={view === 'vocab'}
            onClick={() => setView('vocab')}
          />
          <TabButton
            icon="🃏"
            label="Review"
            active={view === 'review'}
            badge={dueCount}
            onClick={() => setView('review')}
          />
          <TabButton
            icon="⚙️"
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
      <span className="tab-icon" aria-hidden="true">
        {icon}
      </span>
      {label}
      {badge > 0 && <span className="tab-badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}
