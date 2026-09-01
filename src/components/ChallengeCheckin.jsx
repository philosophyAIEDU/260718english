import { useEffect, useState } from 'react';
import { getSetting, setSetting, logActivity, getAllActivity } from '../lib/db.js';
import { isActiveToday } from '../lib/streaks.js';
import { isFirebaseConfigured, CHALLENGE_CONFIG } from '../lib/challengeConfig.js';
import {
  listParticipants,
  listSubmissions,
  saveSubmission,
} from '../lib/challengeStore.js';
import { today, buildStats, riskTag } from '../lib/challengeUtils.js';
import {
  BookOpenIcon,
  SpeakerIcon,
  CheckIcon,
  AlertIcon,
  UsersIcon,
} from './Icons.jsx';

/**
 * The official [Read & Build] challenge check-in: picks (once) which
 * pre-registered participant this device belongs to, then submits a daily
 * "읽었어요 / 들었어요" record to Firestore so the organizer's admin
 * dashboard can track everyone's attendance for the kickout rule.
 *
 * Renders nothing when CHALLENGE_CONFIG.firebase.projectId is empty — a
 * ReadMate deployment that isn't running this specific cohort challenge
 * (or hasn't been configured yet) is completely unaffected.
 */
export default function ChallengeCheckin() {
  if (!isFirebaseConfigured()) return null;
  return <ChallengeCheckinInner />;
}

function ChallengeCheckinInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [myId, setMyId] = useState(null);
  const [pickerValue, setPickerValue] = useState('');
  const [mode, setMode] = useState('read');
  const [bookTitle, setBookTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [stat, setStat] = useState(null);
  const todayISO = today();

  const loadParticipants = () => {
    setLoading(true);
    setError('');
    listParticipants()
      .then(setParticipants)
      .catch(() => setError('참가자 명단을 불러오지 못했어요. 인터넷 연결을 확인해주세요.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getSetting('challengeParticipantId').then((id) => {
      if (id) setMyId(id);
    });
    loadParticipants();
  }, []);

  const refreshMyStat = (id, allParticipants) => {
    const me = allParticipants.find((p) => p.id === id);
    if (!me) return;
    listSubmissions({ participantId: id })
      .then((subs) => setStat(buildStats([me], subs, todayISO)[0]))
      .catch(() => {});
  };

  useEffect(() => {
    if (myId && participants.length) refreshMyStat(myId, participants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, participants]);

  const chooseParticipant = async () => {
    if (!pickerValue) return;
    await setSetting('challengeParticipantId', pickerValue);
    const p = participants.find((x) => x.id === pickerValue);
    await setSetting('challengeNickname', p?.nickname || '');
    setMyId(pickerValue);
  };

  const changeParticipant = async () => {
    setMyId(null);
    setStat(null);
    setPickerValue('');
  };

  const submit = async () => {
    if (!myId || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      const me = participants.find((p) => p.id === myId);
      await saveSubmission({
        participantId: myId,
        nickname: me?.nickname || '',
        date: todayISO,
        mode,
        bookTitle: bookTitle.trim(),
      });
      const before = await getAllActivity();
      if (!isActiveToday(before.map((a) => a.date))) {
        await logActivity({ source: mode === 'listen' ? 'listen' : 'checkin' });
      }
      refreshMyStat(myId, participants);
      setMessage(mode === 'listen' ? '오늘의 듣기 인증 완료! 🎧' : '오늘의 읽기 인증 완료! 📖');
    } catch {
      setMessage('인증 저장에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card challenge-card">
        <div className="skeleton skeleton-line w-60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card challenge-card">
        <div className="error-box">
          <AlertIcon size={17} />
          <span>{error}</span>
        </div>
        <button className="btn" onClick={loadParticipants}>
          다시 시도
        </button>
      </div>
    );
  }

  if (!myId) {
    return (
      <div className="card challenge-card">
        <h2 className="section-title">
          <UsersIcon size={15} /> {CHALLENGE_CONFIG.title} 인증
        </h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          운영진이 등록한 명단에서 내 이름을 골라주세요. 이 기기에서 앞으로
          매일 인증할 때 자동으로 이 이름으로 저장됩니다.
        </p>
        {participants.length === 0 ? (
          <p className="muted small">
            아직 등록된 참가자가 없어요. 운영진에게 명단 등록을 요청해주세요.
          </p>
        ) : (
          <>
            <select
              className="text-input"
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
            >
              <option value="">이름 선택…</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 10 }}
              onClick={chooseParticipant}
              disabled={!pickerValue}
            >
              이 이름으로 시작하기
            </button>
          </>
        )}
      </div>
    );
  }

  const tag = stat ? riskTag(stat) : null;
  const alreadyToday = stat?.submittedToday;

  return (
    <div className="card challenge-card">
      <h2 className="section-title">
        <UsersIcon size={15} /> {CHALLENGE_CONFIG.title} 인증
      </h2>
      <p className="muted small challenge-whoami">
        <strong>{participants.find((p) => p.id === myId)?.nickname}</strong>님으로 인증 중 ·{' '}
        <button className="link-button" onClick={changeParticipant}>
          다른 사람인가요?
        </button>
      </p>

      {stat && (
        <div className={`challenge-stat-row tone-${tag.tone}`}>
          <span>인증 {stat.verified}</span>
          <span>미인증 {stat.missed}</span>
          <span>연속 {stat.streak}일</span>
          <span className="challenge-tag">{tag.label}</span>
        </div>
      )}
      {stat && stat.atRisk && !stat.kickoutEligible && (
        <p className="notice notice-warn">
          <AlertIcon size={16} />
          <span>
            누적 미인증 {stat.missed}회 — {CHALLENGE_CONFIG.kickoutThreshold}회가 되면
            킥아웃 대상이 돼요. 오늘 꼭 인증해보세요!
          </span>
        </p>
      )}
      {stat && stat.kickoutEligible && (
        <p className="notice notice-danger">
          <AlertIcon size={16} />
          <span>누적 미인증 {stat.missed}회로 킥아웃 대상이에요. 운영진에게 문의해주세요.</span>
        </p>
      )}

      {alreadyToday ? (
        <p className="small share-message" style={{ marginTop: 10 }}>
          <CheckIcon size={14} /> 오늘 인증 완료! 내일 또 만나요.
        </p>
      ) : (
        <>
          <div className="mode-toggle" role="group" aria-label="오늘 읽었나요, 들었나요">
            <button
              type="button"
              className={`mode-toggle-btn ${mode === 'read' ? 'active' : ''}`}
              onClick={() => setMode('read')}
            >
              <BookOpenIcon size={16} /> 읽었어요
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${mode === 'listen' ? 'active' : ''}`}
              onClick={() => setMode('listen')}
            >
              <SpeakerIcon size={16} /> 들었어요
            </button>
          </div>
          <input
            className="text-input"
            style={{ marginTop: 8 }}
            placeholder="오늘 읽거나 들은 책 제목 (선택)"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
          />
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 10 }}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? '저장 중…' : '오늘 인증하기'}
          </button>
        </>
      )}

      {message && (
        <p className="small share-message">
          {message.startsWith('인증 저장에') ? <AlertIcon size={14} /> : <CheckIcon size={14} />} {message}
        </p>
      )}
    </div>
  );
}
