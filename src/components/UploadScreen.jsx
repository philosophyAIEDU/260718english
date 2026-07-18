import { useRef, useState } from 'react';
import { prepareImageForUpload } from '../lib/imageUtils.js';
import { analyzePageImage, GeminiError } from '../lib/geminiClient.js';

/**
 * Photo upload / analyze screen. The photo is resized and compressed in the
 * browser (max 1600 px, JPEG) before being sent to Gemini, and is kept only
 * in memory — never persisted.
 */
export default function UploadScreen({ apiKey, onResult }) {
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
      const guide = await analyzePageImage(
        apiKey,
        image.base64,
        image.mimeType,
        setStatus
      );
      setImage(null); // the photo is discarded once the guide is ready
      onResult(guide);
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
        <p className="loading-status">☕ {status || 'Working on your study guide…'}</p>
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
            <span className="big-icon" aria-hidden="true">
              📸
            </span>
            <strong>Snap a page of your book</strong>
            <br />
            <span className="small">
              Take a photo of one page and get an all-English study guide.
            </span>
          </button>
          <div className="upload-actions" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => cameraInputRef.current?.click()}>
              📷 Camera
            </button>
            <button className="btn" onClick={() => galleryInputRef.current?.click()}>
              🖼️ Photo library
            </button>
          </div>
          <p className="muted small" style={{ textAlign: 'center' }}>
            Tip: fill the frame with the page, keep the text sharp, avoid glare.
            <br />
            Photos are compressed on your device and never stored.
          </p>
        </>
      )}

      {preparing && (
        <div className="empty-state">
          <span className="empty-icon">🖼️</span>
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
              ↩︎ Choose another
            </button>
            <button className="btn btn-primary" onClick={handleAnalyze}>
              ✨ Analyze this page
            </button>
          </div>
        </>
      )}

      {error && <div className="error-box">⚠️ {error}</div>}
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
