import { useEffect, useState } from 'react';
import { getDueVocab, updateVocabEntry } from '../lib/db.js';
import { applyReview, nextIntervalLabel, GRADES } from '../lib/spacedRepetition.js';
import {
  CardsIcon,
  CheckIcon,
  RotateIcon,
  MessageIcon,
  ListIcon,
} from './Icons.jsx';
import SpeakButton from './SpeakButton.jsx';

/**
 * Spaced-repetition review: flip-card flashcards over today's due words.
 * Grading with Hard / Good / Easy moves the card between Leitner boxes
 * (see src/lib/spacedRepetition.js for the algorithm notes).
 */
export default function ReviewScreen({ onDone, onVocabChanged }) {
  const [queue, setQueue] = useState(null); // null = loading
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finishedCount, setFinishedCount] = useState(0);

  useEffect(() => {
    getDueVocab()
      .then((due) => setQueue(shuffle(due)))
      .catch(() => setQueue([]));
  }, []);

  const handleGrade = async (grade) => {
    const entry = queue[index];
    const nextSrs = applyReview(entry.srs, grade);
    await updateVocabEntry({ ...entry, srs: nextSrs });
    onVocabChanged?.();
    setFinishedCount((c) => c + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  if (queue === null) {
    return (
      <div className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line w-60" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-ring">
          <CheckIcon size={30} />
        </div>
        <h3>All caught up!</h3>
        <p>
          No words are due for review right now. Words come back on a
          1 → 3 → 7 → 14 day rhythm, so check again tomorrow — or scan a new
          page and star some fresh vocabulary.
        </p>
      </div>
    );
  }

  if (index >= queue.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon-ring">
          <CardsIcon size={28} />
        </div>
        <h3>Review complete!</h3>
        <p>
          You reviewed {finishedCount} {finishedCount === 1 ? 'word' : 'words'} today.
          Well done — see you at the next interval.
        </p>
        <button className="btn btn-primary" onClick={onDone}>
          Open Word Book
        </button>
      </div>
    );
  }

  const entry = queue[index];
  const progress = (index / queue.length) * 100;

  return (
    <section>
      <p className="review-progress">
        Card {index + 1} of {queue.length}
      </p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="flashcard-stage">
        <div
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          aria-label={flipped ? 'Show the word' : 'Show the definition'}
        >
          <div className="flashcard-face front">
            <p className="flashcard-front-word">
              {entry.word}
              <SpeakButton text={entry.word} size={20} />
            </p>
            {entry.partOfSpeech && (
              <p className="muted" style={{ fontStyle: 'italic', margin: '4px 0 0' }}>
                {entry.partOfSpeech}
              </p>
            )}
            <span className="flip-hint">
              <RotateIcon size={14} /> Tap to reveal the meaning
            </span>
          </div>

          <div className="flashcard-face back">
            <h3 style={{ marginTop: 0 }}>
              {entry.word}
              {entry.partOfSpeech && (
                <span className="vocab-pos">({entry.partOfSpeech})</span>
              )}
              <SpeakButton text={entry.word} />
            </h3>
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
          </div>
        </div>
      </div>

      {flipped ? (
        <div className="grade-row">
          <button
            className="btn btn-grade-hard"
            onClick={() => handleGrade(GRADES.HARD)}
          >
            Hard
            <span className="grade-interval">{nextIntervalLabel(entry.srs, GRADES.HARD)}</span>
          </button>
          <button
            className="btn btn-grade-good"
            onClick={() => handleGrade(GRADES.GOOD)}
          >
            Good
            <span className="grade-interval">{nextIntervalLabel(entry.srs, GRADES.GOOD)}</span>
          </button>
          <button
            className="btn btn-grade-easy"
            onClick={() => handleGrade(GRADES.EASY)}
          >
            Easy
            <span className="grade-interval">{nextIntervalLabel(entry.srs, GRADES.EASY)}</span>
          </button>
        </div>
      ) : (
        <p className="recall-hint">
          Try to recall the meaning, then tap the card to check yourself.
        </p>
      )}
    </section>
  );
}

/** Fisher–Yates shuffle so review order varies day to day. */
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
