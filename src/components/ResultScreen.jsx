import { useState } from 'react';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  LibraryIcon,
  BranchIcon,
  MessageIcon,
  PencilIcon,
  ChevronDownIcon,
  PrinterIcon,
  ImageIcon,
  QuoteIcon,
} from './Icons.jsx';
import VocabCard from './VocabCard.jsx';

/**
 * Study-guide screen. Renders the sections returned by Gemini, in order:
 * Page Summary → Original Source → Key Vocabulary → Sentence Breakdown →
 * Comprehension Check → Try This. All Gemini-written content is
 * English-only by design; `sourceContent` (the scanned photo or the
 * Library page's own text) is the one thing on this screen that isn't
 * generated — it's included so Print produces a record with both the
 * summary and what it was based on.
 */
export default function ResultScreen({
  result,
  sourceContent,
  onBack,
  onVocabChanged,
  backLabel = 'Scan another page',
}) {
  return (
    <section>
      <div className="result-toolbar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> {backLabel}
        </button>
        <button className="btn btn-ghost" onClick={() => window.print()}>
          <PrinterIcon size={16} /> Print
        </button>
      </div>

      <div id="printable-study-guide">
        <PageSummary summary={result.pageSummary} />
        <OriginalSource source={sourceContent} />
        <KeyVocabulary items={result.keyVocabulary} onVocabChanged={onVocabChanged} />
        {result.sentenceBreakdown && (
          <SentenceBreakdown breakdown={result.sentenceBreakdown} />
        )}
        {result.comprehensionQuestions?.length > 0 && (
          <ComprehensionCheck questions={result.comprehensionQuestions} />
        )}
        {result.tryThis && <TryThis prompt={result.tryThis} />}
      </div>
    </section>
  );
}

function OriginalSource({ source }) {
  if (!source) return null;

  if (source.type === 'photo' && source.imageDataUrl) {
    return (
      <div className="card original-source">
        <h2 className="section-title">
          <ImageIcon size={15} /> Original Page (Photo)
        </h2>
        <img
          src={source.imageDataUrl}
          alt="The scanned book page this study guide was made from"
          className="original-source-image"
        />
      </div>
    );
  }

  if (source.type === 'library' && source.paragraphs?.length > 0) {
    return (
      <div className="card original-source">
        <h2 className="section-title">
          <QuoteIcon size={15} /> Original Text
        </h2>
        {(source.bookTitle || source.chapterTitle) && (
          <p className="muted small" style={{ marginTop: 0 }}>
            {[source.bookTitle, source.chapterTitle].filter(Boolean).join(' — ')}
          </p>
        )}
        <div className="original-source-text">
          {source.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    );
  }

  return null;
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
            <div className="accordion-answer">
              <p>{q.answer}</p>
            </div>
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
