import { useEffect, useState } from 'react';
import { saveVocabEntry, findVocabByWord, deleteVocabEntry } from '../lib/db.js';
import { StarIcon, MessageIcon, ListIcon } from './Icons.jsx';
import SpeakButton from './SpeakButton.jsx';

/**
 * One vocabulary entry, with a star button to save/remove it from the Word
 * Book. Shared by the study-guide's Key Vocabulary section (ResultScreen)
 * and the Library reader's tap-a-word dictionary lookup (BookReaderScreen)
 * so both places save into the same spaced-repetition Word Book the same way.
 */
export default function VocabCard({ entry, onVocabChanged }) {
  const [savedId, setSavedId] = useState(null);
  const [busy, setBusy] = useState(false);

  // A word may already be in the book from an earlier page.
  useEffect(() => {
    let alive = true;
    findVocabByWord(entry.word).then((existing) => {
      if (alive && existing) setSavedId(existing.id);
    });
    return () => {
      alive = false;
    };
  }, [entry.word]);

  const toggleStar = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (savedId) {
        await deleteVocabEntry(savedId);
        setSavedId(null);
      } else {
        const record = await saveVocabEntry(entry);
        setSavedId(record.id);
      }
      onVocabChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="vocab-card">
      <div className="vocab-head">
        <h3 className="vocab-word">
          {entry.word}
          {entry.partOfSpeech && <span className="vocab-pos">({entry.partOfSpeech})</span>}
          <SpeakButton text={entry.word} />
        </h3>
        <div className="vocab-head-controls">
          <span className={`pill pill-register-${normalizeRegister(entry.register)}`}>
            {entry.register}
          </span>
          <button
            className={`star-button ${savedId ? 'starred' : ''}`}
            onClick={toggleStar}
            aria-label={savedId ? 'Remove from Word Book' : 'Save to Word Book'}
            title={savedId ? 'Remove from Word Book' : 'Save to Word Book'}
          >
            <StarIcon size={21} filled={!!savedId} />
          </button>
        </div>
      </div>

      {entry.collinsDefinition && (
        <div className="def-block def-collins">
          <span className="def-label">
            <MessageIcon size={11} /> Definition
          </span>
          {entry.collinsDefinition}
        </div>
      )}

      {entry.longmanSynonyms?.length > 0 && (
        <div className="def-block def-longman">
          <span className="def-label">
            <ListIcon size={11} /> Synonyms
          </span>
          {entry.longmanSynonyms.join(' · ')}
        </div>
      )}

      {entry.exampleFromPage && (
        <blockquote className="example-quote">“{entry.exampleFromPage}”</blockquote>
      )}

      {entry.wordFamily?.length > 0 && (
        <p className="vocab-meta">
          <strong>Word family</strong> {entry.wordFamily.join(', ')}
        </p>
      )}
      {entry.collocations?.length > 0 && (
        <p className="vocab-meta">
          <strong>Collocations</strong> {entry.collocations.join(' · ')}
        </p>
      )}
    </article>
  );
}

function normalizeRegister(register) {
  const r = String(register || 'neutral').toLowerCase();
  return ['formal', 'informal', 'neutral', 'literary'].includes(r) ? r : 'neutral';
}
