import { useEffect, useState } from 'react';
import { lookupWord, GeminiError } from '../lib/geminiClient.js';
import { AlertIcon } from './Icons.jsx';
import VocabCard from './VocabCard.jsx';

/**
 * Tap-any-word dictionary lookup for the Library reader. Given the word a
 * learner just tapped and the sentence it appeared in, asks Gemini for a
 * context-aware definition and renders it with the same VocabCard used by
 * the study guide, so a good word can be starred straight into the Word
 * Book without running a full page analysis first.
 */
export default function WordLookupPanel({ apiKey, readingLevel, word, context, onClose, onVocabChanged }) {
  const [entry, setEntry] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    setError('');
    setEntry(null);
    lookupWord(apiKey, word, context, { level: readingLevel })
      .then((result) => {
        if (alive) setEntry(result);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof GeminiError ? err.message : '뜻풀이를 가져오지 못했어요. 다시 시도해주세요.');
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, context, apiKey, readingLevel, attempt]);

  return (
    <div className="card lookup-panel">
      <div className="lookup-panel-head">
        <h3 className="lookup-panel-title">📖 “{word}” 사전</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          닫기
        </button>
      </div>

      {busy && (
        <p className="loading-status small">
          <span className="spinner" aria-hidden="true" />이 문장 속에서 뜻을 찾는 중…
        </p>
      )}

      {!busy && error && (
        <div className="error-box">
          <AlertIcon size={17} />
          <span>{error}</span>
          <button className="btn btn-sm" onClick={() => setAttempt((a) => a + 1)}>
            다시 시도
          </button>
        </div>
      )}

      {!busy && entry && <VocabCard entry={entry} onVocabChanged={onVocabChanged} />}
    </div>
  );
}
