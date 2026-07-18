import { speak, speechSupported } from '../lib/speech.js';
import { SpeakerIcon } from './Icons.jsx';

/**
 * Small inline button that reads `text` aloud via the browser's built-in
 * text-to-speech. Renders nothing if the browser has no speech support.
 * Always calls stopPropagation — it's often nested inside a clickable
 * card (e.g. the review flashcard) that shouldn't react to this tap.
 */
export default function SpeakButton({ text, size = 16, label }) {
  if (!speechSupported()) return null;
  return (
    <button
      type="button"
      className="speak-button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={label || `Listen to the pronunciation of "${text}"`}
      title="Listen"
    >
      <SpeakerIcon size={size} />
    </button>
  );
}
