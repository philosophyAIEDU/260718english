import { useEffect, useState } from 'react';
import {
  saveVocabEntry,
  findVocabByWord,
  deleteVocabEntry,
} from '../lib/db.js';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  LibraryIcon,
  StarIcon,
  BranchIcon,
  MessageIcon,
  PencilIcon,
  ChevronDownIcon,
  ListIcon,
} from './Icons.jsx';

/**
 * Study-guide screen. Renders the sections returned by Gemini, in order:
 * Page Summary → Key Vocabulary → Sentence Breakdown → Comprehension Check
 * → Try This. All content is English-only by design.
 */
export default function ResultScreen({ result, onBack, onVocabChanged }) {
  return (
    <section>
      <button className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={16} /> Scan another page
      </button>

      <PageSummary summary={result.pageSummary} />
      <KeyVocabulary items={result.keyVocabulary} onVocabChanged={onVocabChanged} />
      {result.sentenceBreakdown && (
        <SentenceBreakdown breakdown={result.sentenceBreakdown} />
      )}
      {result.comprehensionQuestions?.length > 0 && (
        <ComprehensionCheck questions={result.comprehensionQuestions} />
      )}
      {result.tryThis && <TryThis prompt={result.tryThis} />}
    </section>
  );
}

function PageSummary({ summary }) {
  return (
    <div className="card">
      <h2 className="section-title">
        <BookOpenIcon size={15} /> Page Summary
      </h2>
      <p className="summary-text">{summary}</p>
    </div>
  );
}

function KeyVocabulary({ items, onVocabChanged }) {
  return (
    <div className="card">
      <h2 className="section-title">
        <LibraryIcon size={15} /> Key Vocabulary
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Tap the star to keep a word in your Word Book for spaced-repetition
        review.
      </p>
      {items.map((v) => (
        <VocabCard key={v.word} entry={v} onVocabChanged={onVocabChanged} />
      ))}
    </div>
  );
}

function VocabCard({ entry, onVocabChanged }) {
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
            <MessageIcon size={11} /> Collins-style
          </span>
          {entry.collinsDefinition}
        </div>
      )}

      {entry.longmanSynonyms?.length > 0 && (
        <div className="def-block def-longman">
          <span className="def-label">
            <ListIcon size={11} /> Longman-style
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

function SentenceBreakdown({ breakdown }) {
  return (
    <div className="card">
      <h2 className="section-title">
        <BranchIcon size={15} /> Sentence Breakdown
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        A complex sentence from the page, lightly paraphrased, broken into its
        grammatical parts.
      </p>
      <p className="breakdown-sentence">“{breakdown.sentence}”</p>
      {breakdown.parts.map((part, i) => (
        <div className="breakdown-part" key={i}>
          <span className="breakdown-label">{part.label}</span>
          <span className="breakdown-text">{part.text}</span>
          {part.explanation && (
            <span className="breakdown-explanation">{part.explanation}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ComprehensionCheck({ questions }) {
  const [openIndex, setOpenIndex] = useState(null);
  return (
    <div className="card">
      <h2 className="section-title">
        <MessageIcon size={15} /> Comprehension Check
      </h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Answer in your head first, then tap to reveal a model answer.
      </p>
      {questions.map((q, i) => {
        const open = openIndex === i;
        return (
          <div className={`accordion-item ${open ? 'open' : ''}`} key={i}>
            <button
              className="accordion-question"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
            >
              <span>
                {i + 1}. {q.question}
              </span>
              <span className="accordion-chevron">
                <ChevronDownIcon size={17} />
              </span>
            </button>
            {open && (
              <div className="accordion-answer">
                <p>{q.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TryThis({ prompt }) {
  const [text, setText] = useState('');
  return (
    <div className="card">
      <h2 className="section-title">
        <PencilIcon size={15} /> Try This
      </h2>
      <div className="try-this">
        {prompt}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your sentence here… (just for practice — it is not saved or sent anywhere)"
        />
      </div>
    </div>
  );
}
