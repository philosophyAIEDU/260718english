import { useEffect, useMemo, useState } from 'react';
import { getAllVocab, deleteVocabEntry, updateVocabEntry } from '../lib/db.js';
import { toAnkiCsv, toQuizletText, downloadTextFile } from '../lib/exportUtils.js';
import { BOX_INTERVALS_DAYS } from '../lib/spacedRepetition.js';
import {
  LibraryIcon,
  DownloadIcon,
  SearchIcon,
  TagIcon,
  TrashIcon,
  MessageIcon,
  ListIcon,
} from './Icons.jsx';

/**
 * Word Book: every starred word, with search (word text), register filter,
 * tag filter, per-entry tag editing, and Anki/Quizlet export.
 */
export default function VocabScreen({ onVocabChanged }) {
  const [entries, setEntries] = useState(null); // null = loading
  const [query, setQuery] = useState('');
  const [registerFilter, setRegisterFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const reload = () => {
    getAllVocab()
      .then(setEntries)
      .catch(() => setEntries([]));
  };

  useEffect(reload, []);

  const allTags = useMemo(() => {
    const tags = new Set();
    (entries || []).forEach((e) => (e.tags || []).forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (registerFilter !== 'all' && e.register !== registerFilter) return false;
      if (tagFilter !== 'all' && !(e.tags || []).includes(tagFilter)) return false;
      if (!q) return true;
      return (
        e.word.toLowerCase().includes(q) ||
        e.collinsDefinition.toLowerCase().includes(q) ||
        (e.longmanSynonyms || []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [entries, query, registerFilter, tagFilter]);

  const handleDelete = async (entry) => {
    if (!window.confirm(`Remove “${entry.word}” from your Word Book?`)) return;
    await deleteVocabEntry(entry.id);
    reload();
    onVocabChanged?.();
  };

  const handleEditTags = async (entry) => {
    const current = (entry.tags || []).join(', ');
    const next = window.prompt(
      'Tags for this word (comma-separated, e.g. "chapter 3, harry potter"):',
      current
    );
    if (next === null) return;
    const tags = next
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await updateVocabEntry({ ...entry, tags });
    reload();
  };

  const exportAnki = () => {
    downloadTextFile(toAnkiCsv(entries || []), 'readmate-anki.csv', 'text/csv');
  };

  const exportQuizlet = () => {
    downloadTextFile(
      toQuizletText(entries || []),
      'readmate-quizlet.txt',
      'text/plain'
    );
  };

  if (entries === null) {
    return (
      <div className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line w-80" />
        <div className="skeleton skeleton-line w-60" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-ring">
          <LibraryIcon size={30} />
        </div>
        <h3>Your Word Book is empty</h3>
        <p>
          Scan a page and tap the star on any word to start collecting
          vocabulary. Starred words come back for review on a 1 → 3 → 7 → 14
          day schedule.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="screen-heading">
        <h2>Word Book</h2>
        <span className="count">
          {filtered.length} of {entries.length} {entries.length === 1 ? 'word' : 'words'}
        </span>
      </div>

      <div className="export-row">
        <button className="btn" onClick={exportAnki}>
          <DownloadIcon size={16} /> Anki (CSV)
        </button>
        <button className="btn" onClick={exportQuizlet}>
          <DownloadIcon size={16} /> Quizlet (TXT)
        </button>
      </div>

      <div className="vocab-toolbar">
        <div className="search-wrap">
          <SearchIcon size={16} />
          <input
            className="text-input"
            type="search"
            placeholder="Search words, definitions, synonyms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search your word book"
          />
        </div>
        <select
          value={registerFilter}
          onChange={(e) => setRegisterFilter(e.target.value)}
          aria-label="Filter by register"
        >
          <option value="all">All registers</option>
          <option value="formal">Formal</option>
          <option value="informal">Informal</option>
          <option value="neutral">Neutral</option>
          <option value="literary">Literary</option>
        </select>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            aria-label="Filter by tag"
          >
            <option value="all">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-ring">
            <SearchIcon size={28} />
          </div>
          <h3>No matches</h3>
          <p>Try a different search or clear the filters.</p>
        </div>
      ) : (
        filtered.map((entry) => (
          <article className="vocab-card" key={entry.id}>
            <div className="vocab-head">
              <h3 className="vocab-word">
                {entry.word}
                {entry.partOfSpeech && (
                  <span className="vocab-pos">({entry.partOfSpeech})</span>
                )}
              </h3>
              <span className={`pill pill-register-${entry.register || 'neutral'}`}>
                {entry.register || 'neutral'}
              </span>
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

            <div className="saved-meta-row">
              <span>Saved {formatDate(entry.savedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>
                Next review {formatDate(entry.srs?.dueDate)} (box {entry.srs?.box + 1},
                every {BOX_INTERVALS_DAYS[entry.srs?.box ?? 0]}d)
              </span>
              {(entry.tags || []).map((t) => (
                <span className="tag-chip" key={t}>
                  #{t}
                </span>
              ))}
            </div>

            <div className="entry-actions">
              <button className="btn btn-ghost" onClick={() => handleEditTags(entry)}>
                <TagIcon size={14} /> Tags
              </button>
              <button className="btn btn-ghost" onClick={() => handleDelete(entry)}>
                <TrashIcon size={14} /> Remove
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
