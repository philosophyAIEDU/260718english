import { coverFor } from '../lib/bookCovers.js';

/**
 * A small book-cover thumbnail: a portrait tile with the book's gradient,
 * a themed emoji, and a subtle spine so it reads as a real book on a
 * shelf. Decorative — the emoji is aria-hidden and the title is announced
 * elsewhere.
 */
export default function BookCover({ bookId, size = 'md' }) {
  const cover = coverFor(bookId);
  return (
    <span
      className={`book-cover book-cover-${size}`}
      style={{
        background: `linear-gradient(150deg, ${cover.from}, ${cover.to})`,
      }}
      aria-hidden="true"
    >
      <span className="book-cover-spine" />
      <span className="book-cover-emoji">{cover.emoji}</span>
    </span>
  );
}
