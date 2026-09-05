import { useEffect, useRef, useState } from 'react';
import { getNote, saveNote } from '../lib/db.js';
import { PencilIcon, ChevronDownIcon } from './Icons.jsx';

const SAVE_DELAY_MS = 700;

/**
 * A free-text notepad for one Library book — a place to jot down unfamiliar
 * words or thoughts while reading, without leaving the reader. One note per
 * book, autosaved to IndexedDB shortly after the learner stops typing.
 */
export default function NotepadPanel({ bookId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState(''); // '' | 'typing' | 'saved'
  const loadedBookId = useRef(null);
  const saveTimer = useRef(null);

  // Load this book's note once, the first time the panel is opened for it.
  useEffect(() => {
    if (loadedBookId.current === bookId) return;
    loadedBookId.current = bookId;
    setText('');
    setStatus('');
    getNote(bookId).then((note) => {
      if (loadedBookId.current === bookId) setText(note?.text || '');
    });
  }, [bookId]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleChange = (value) => {
    setText(value);
    setStatus('typing');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNote(bookId, value)
        .then(() => setStatus('saved'))
        .catch(() => setStatus(''));
    }, SAVE_DELAY_MS);
  };

  return (
    <div className="card notepad-panel">
      <button
        type="button"
        className="notepad-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>
          <PencilIcon size={15} /> 내 메모
        </span>
        <ChevronDownIcon size={16} className={open ? 'chevron-open' : ''} />
      </button>
      {open && (
        <>
          <p className="muted small" style={{ marginTop: 0 }}>
            이 책을 읽으며 모르는 단어나 생각을 자유롭게 적어두세요. 이 기기에만
            저장됩니다.
          </p>
          <textarea
            className="text-input notepad-textarea"
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="예) unrequited - 짝사랑, 되돌려받지 못한 (사랑) …"
            rows={5}
          />
          <p className="muted small notepad-status">
            {status === 'saved' && '저장됨'}
            {status === 'typing' && '입력 중…'}
          </p>
        </>
      )}
    </div>
  );
}
