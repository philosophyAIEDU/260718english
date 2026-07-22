import { useRef, useState } from 'react';
import { prepareImageForUpload } from '../lib/imageUtils.js';
import { analyzePageImage, GeminiError } from '../lib/geminiClient.js';
import { logActivity } from '../lib/db.js';
import {
  CameraIcon,
  ImageIcon,
  SparklesIcon,
  ArrowLeftIcon,
  AlertIcon,
} from './Icons.jsx';

/**
 * Photo upload / analyze screen. The photo is resized and compressed in the
 * browser (max 1600 px, JPEG) before being sent to Gemini, and is kept only
 * in memory — never persisted.
 */
export default function UploadScreen({ apiKey, readingLevel, onResult }) {
  const [image, setImage] = useState(null); // { base64, mimeType, previewUrl }
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setPreparing(true);
    try {
      const prepared = await prepareImageForUpload(file);
      setImage(prepared);
    } catch (err) {
      setError(err.message || 'Could not read that image. Please try another photo.');
      setImage(null);
    } finally {
      setPreparing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!image || analyzing) return;
    setError('');
    setAnalyzing(true);
    setStatus('Sending the page to Gemini…');
    try {
      const guide = await analyzePageImage(apiKey, image.base64, image.mimeType, {
        level: readingLevel,
        onStatus: setStatus,
      });
      // The photo is never saved to IndexedDB or disk. A copy of the
      // preview stays in memory only for this result view (so it can be
      // shown/printed alongside the study guide) and is dropped as soon
      // as the learner navigates away.
      const imageDataUrl = image.previewUrl;
      setImage(null);
      await logActivity({ source: 'photo' });
      onResult(guide, { type: 'photo', imageDataUrl });
    } catch (err) {
      if (err instanceof GeminiError) setError(err.message);
      else setError('Something unexpected went wrong. Please try again.');
    } finally {
      setAnalyzing(false);
      setStatus('');
    }
  };

  const reset = () => {
    setImage(null);
    setError('');
  };

  if (analyzing) {
    return (
      <section>
        <p className="loading-status">
          <span className="spinner" aria-hidden="true" />
          {status || 'Working on your study guide…'}
        </p>
        <AnalysisSkeleton />
      </section>
    );
  }

  return (
    <section>
      {/* Hidden inputs: one opens the camera, one opens the photo library. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {!image && !preparing && (
        <>
          <button className="drop-zone" onClick={() => cameraInputRef.current?.click()}>
            <span className="drop-zone-icon">
              <CameraIcon size={28} />
            </span>
            <strong>Snap a page of your book</strong>
            <span className="small">
              Take a photo of one page and get an all-English study guide —
              summary, vocabulary, grammar, and comprehension questions.
            </span>
          </button>
          <div className="upload-actions" style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => cameraInputRef.current?.click()}>
              <CameraIcon size={17} /> Camera
            </button>
            <button className="btn" onClick={() => galleryInputRef.current?.click()}>
              <ImageIcon size={17} /> Photo library
            </button>
          </div>
          <p className="upload-tip">
            Tip: fill the frame with the page, keep the text sharp, avoid glare.
            <br />
            Photos are compressed on your device and never stored.
          </p>
        </>
      )}

      {preparing && (
        <div className="empty-state">
          <div className="empty-icon-ring">
            <ImageIcon size={28} />
          </div>
          <p>Preparing your photo…</p>
        </div>
      )}

      {image && !preparing && (
        <>
          <div className="preview-wrap">
            <img src={image.previewUrl} alt="Preview of the book page you selected" />
          </div>
          <div className="upload-actions">
            <button className="btn" onClick={reset}>
              <ArrowLeftIcon size={16} /> Choose another
            </button>
            <button className="btn btn-primary" onClick={handleAnalyze}>
              <SparklesIcon size={17} /> Analyze this page
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="error-box">
          <AlertIcon size={17} />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

/** Skeleton placeholder shown while Gemini reads the page. */
function AnalysisSkeleton() {
  return (
    <>
      <div className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line w-80" />
        <div className="skeleton skeleton-line w-60" />
      </div>
      <div className="card">
        <div className="skeleton skeleton-title" />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div className="skeleton skeleton-line w-60" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line w-80" />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line w-80" />
      </div>
    </>
  );
}
