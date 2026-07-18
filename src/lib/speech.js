/*
 * Text-to-speech for vocabulary words, using the browser's built-in Web
 * Speech API (speechSynthesis) — free, offline-capable on most platforms,
 * and requires no API key or network call.
 */

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak `text` in English, cancelling any speech already in progress. */
export function speak(text) {
  if (!speechSupported() || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
