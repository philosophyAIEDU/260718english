/*
 * Per-book cover art: a friendly emoji motif + a cheerful two-color
 * gradient for each Library book. Purely decorative — it turns the
 * otherwise text-heavy Library into a colorful, approachable bookshelf so
 * beginners can pick a book by its "cover" the way they would in a real
 * bookstore. Keyed by the book id in public/books/index.json.
 */

const COVERS = {
  'wizard-of-oz': { emoji: '🌈', from: '#57c97a', to: '#2f9e5b' },
  'alice-in-wonderland': { emoji: '🐇', from: '#6db6f2', to: '#4a7fe0' },
  'secret-garden': { emoji: '🌷', from: '#78d3a2', to: '#3aa877' },
  'anne-of-green-gables': { emoji: '🌸', from: '#f79ac0', to: '#e85b9a' },
  'sherlock-holmes': { emoji: '🔍', from: '#8f9cd0', to: '#5a66a8' },
  'call-of-the-wild': { emoji: '🐺', from: '#8fb0c8', to: '#556f8a' },
  'christmas-carol': { emoji: '🕯️', from: '#ef8a80', to: '#cf4a43' },
  'treasure-island': { emoji: '🗺️', from: '#f2bd5f', to: '#d68b1e' },
  'jekyll-and-hyde': { emoji: '🎭', from: '#9d90d6', to: '#6a57a0' },
  'great-gatsby': { emoji: '🥂', from: '#f4cf5c', to: '#caa023' },
  'pride-and-prejudice': { emoji: '💌', from: '#f5a6ba', to: '#d76d8b' },
  'frankenstein': { emoji: '⚡', from: '#83a596', to: '#4d6f60' },
};

// Fallback for any book without an explicit cover (e.g. a future addition).
const DEFAULT_COVER = { emoji: '📖', from: '#e0b968', to: '#c08000' };

export function coverFor(bookId) {
  return COVERS[bookId] || DEFAULT_COVER;
}
