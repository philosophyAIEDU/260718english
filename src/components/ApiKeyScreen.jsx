import { useState } from 'react';
import { setSetting, deleteSetting } from '../lib/db.js';
import { isFirebaseConfigured } from '../lib/challengeConfig.js';
import {
  KeyIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
  CheckIcon,
  TrophyIcon,
  ShieldIcon,
} from './Icons.jsx';

/**
 * API key entry / settings screen. The key is stored in IndexedDB on this
 * device only and is sent exclusively to the Google Gemini API endpoint.
 */
export default function ApiKeyScreen({
  existingKey = '',
  onSaved,
  readingLevel,
  onTakeLevelTest,
  onOpenAdmin,
}) {
  const [key, setKey] = useState(existingKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = key.trim();
    setError('');
    setMessage('');
    if (!trimmed) {
      setError('Please paste your Gemini API key first.');
      return;
    }
    if (trimmed.length < 20) {
      setError('That looks too short to be a Gemini API key. Please check and try again.');
      return;
    }
    setSaving(true);
    try {
      await setSetting('geminiApiKey', trimmed);
      setMessage('Saved! Your key is stored only on this device.');
      onSaved?.(trimmed);
    } catch {
      setError('Could not save the key on this device. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove the saved API key from this device?')) return;
    try {
      await deleteSetting('geminiApiKey');
      setKey('');
      setMessage('');
      onSaved?.('');
      window.location.reload();
    } catch {
      setError('Could not remove the key. Please try again.');
    }
  };

  return (
    <section>
      <div className="card">
        <h2 className="section-title">
          <KeyIcon size={15} /> Gemini API Key
        </h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          ReadMate uses your own Google Gemini API key to read your book pages.
          Get a free key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            aistudio.google.com/apikey
          </a>
          , then paste it below.
        </p>

        <label className="field-label" htmlFor="api-key-input">
          Your API key
        </label>
        <div className="input-with-button">
          <input
            id="api-key-input"
            className="text-input"
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza…"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="button"
            className="input-inline-button"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? 'Hide the API key' : 'Show the API key'}
            title={showKey ? 'Hide' : 'Show'}
          >
            {showKey ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </div>

        {error && (
          <div className="error-box">
            <AlertIcon size={17} />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <p
            className="small"
            style={{
              color: 'var(--collins)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <CheckIcon size={15} /> {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : existingKey ? 'Update key' : 'Save & start reading'}
          </button>
          {existingKey && (
            <button className="btn btn-danger" onClick={handleRemove}>
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="notice">
        <LockIcon size={18} />
        <span>
          이 키는 Google Gemini API 호출에만 쓰이며 다른 서버로 전송되지
          않습니다. — Your key is used only to call the Google Gemini API and is
          never sent to any other server. It is stored in this browser
          (IndexedDB) on this device only. No sign-up, no tracking, no ads.
        </span>
      </div>

      {onTakeLevelTest && (
        <div className="card">
          <h2 className="section-title">
            <TrophyIcon size={15} /> 영어 레벨 테스트
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {readingLevel
              ? `현재 레벨: ${readingLevel}. 학습 가이드의 어휘 난이도와 라이브러리 추천에 반영됩니다.`
              : '6문제로 내 영어 레벨을 확인하면, 학습 가이드의 어휘 난이도와 라이브러리 추천 도서에 반영돼요.'}
          </p>
          <button className="btn" onClick={onTakeLevelTest}>
            <TrophyIcon size={16} /> {readingLevel ? '다시 테스트하기' : '테스트 시작하기'}
          </button>
        </div>
      )}

      {isFirebaseConfigured() && onOpenAdmin && (
        <div className="card">
          <h2 className="section-title">
            <ShieldIcon size={15} /> 운영자이신가요?
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            챌린지 참가자 전체의 인증 현황을 보고 명단을 관리하려면 관리자
            화면으로 이동하세요. 운영진 구글 계정 로그인이 필요합니다.
          </p>
          <button className="btn" onClick={onOpenAdmin}>
            <ShieldIcon size={16} /> 관리자 대시보드 열기
          </button>
        </div>
      )}

      {onTakeLevelTest && (
        <p className="app-credit">
          ReadMate — 필로소피 AI 교육의 정신을 담아 만든 프로젝트입니다.
        </p>
      )}
    </section>
  );
}
