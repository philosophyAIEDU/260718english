import { useEffect, useState } from 'react';
import { logActivity, getAllActivity } from '../lib/db.js';
import { isActiveToday } from '../lib/streaks.js';
import { isFirebaseConfigured, CHALLENGE_CONFIG } from '../lib/challengeConfig.js';
import {
  onAuthReady,
  signInWithGoogle,
  signOut,
  getMyParticipant,
  registerParticipant,
  updateMyNickname,
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
  GoogleIcon,
} from './Icons.jsx';

/**
 * The daily check-in, and the gate in front of it.
 *
 * A participant signs in with Google once and picks a nickname; that
 * creates their entry under their account, so the organizer never
 * maintains a roster and nobody can certify as someone else. After that
 * this card is just "읽었어요 / 들었어요 → 오늘 인증하기", plus how many
 * days they've missed against the kickout threshold.
 *
 * Renders nothing when CHALLENGE_CONFIG.firebase.projectId is empty, so a
 * deployment that isn't running this cohort is unaffected.
 */
export default function ChallengeCheckin() {
  if (!isFirebaseConfigured()) return null;
  return <ChallengeCheckinInner />;
}

function ChallengeCheckinInner() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [me, setMe] = useState(undefined); // undefined = not loaded, null = not joined
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState('read');
  const [bookTitle, setBookTitle] = useState('');
  const [message, setMessage] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [stat, setStat] = useState(null);
  const todayISO = today();

  useEffect(() => onAuthReady(setUser), []);

  // Whenever the account changes, reload who that account is in the challenge.
  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      setMe(null);
      setStat(null);
      return;
    }
    let alive = true;
    setError('');
    getMyParticipant()
      .then((participant) => {
        if (!alive) return;
        setMe(participant);
        if (participant) refreshStat(participant);
      })
      .catch(() => alive && setError('내 정보를 불러오지 못했어요. 인터넷 연결을 확인해주세요.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshStat = (participant) => {
    listSubmissions({ participantId: participant.id })
      .then((subs) => setStat(buildStats([participant], subs, todayISO)[0]))
      .catch(() => {});
  };

  const run = async (action, onDone) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      onDone?.();
    } catch (err) {
      setError(err?.message || '문제가 생겼어요. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = () =>
    run(async () => {
      await signInWithGoogle();
    });

  const handleJoin = () =>
    run(
      async () => {
        const participant = await registerParticipant(nickname);
        setMe(participant);
        refreshStat(participant);
      },
      () => setMessage('환영합니다! 이제 매일 인증하시면 됩니다.')
    );

  const handleRename = () =>
    run(
      async () => {
        const nick = await updateMyNickname(nickname);
        setMe((prev) => ({ ...prev, nickname: nick }));
      },
      () => {
        setEditingNick(false);
        setMessage('닉네임을 변경했어요.');
      }
    );

  const handleSubmit = () =>
    run(
      async () => {
        await saveSubmission({
          participantId: me.id,
          nickname: me.nickname,
          date: todayISO,
          mode,
          bookTitle: bookTitle.trim(),
        });
        const before = await getAllActivity();
        if (!isActiveToday(before.map((a) => a.date))) {
          await logActivity({ source: mode === 'listen' ? 'listen' : 'checkin' });
        }
        refreshStat(me);
      },
      () => setMessage(mode === 'listen' ? '오늘의 듣기 인증 완료! 🎧' : '오늘의 읽기 인증 완료! 📖')
    );

  const errorBox = error && (
    <div className="error-box">
      <AlertIcon size={17} />
      <span>{error}</span>
    </div>
  );

  /* ---------------------------- still checking ---------------------------- */
  if (user === undefined || (user && me === undefined)) {
    return (
      <div className="card challenge-card">
        <h2 className="section-title">
          <UsersIcon size={15} /> 오늘의 인증
        </h2>
        <div className="skeleton skeleton-line w-80" />
        <div className="skeleton skeleton-line w-60" />
      </div>
    );
  }

  /* ------------------------------ signed out ------------------------------ */
  if (!user) {
    return (
      <div className="card challenge-card">
        <h2 className="section-title">
          <UsersIcon size={15} /> 챌린지 참여하기
        </h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          구글 계정으로 로그인하고 닉네임만 정하면 바로 참여할 수 있어요. 매일
          읽거나 들은 것을 인증하면 운영진이 자동으로 확인합니다.
        </p>
        {errorBox}
        <button className="btn btn-primary btn-block" onClick={handleSignIn} disabled={busy}>
          <GoogleIcon size={17} /> {busy ? '연결 중…' : 'Google로 시작하기'}
        </button>
      </div>
    );
  }

  /* --------------------- signed in, hasn't joined yet --------------------- */
  if (!me) {
    return (
      <div className="card challenge-card">
        <h2 className="section-title">
          <UsersIcon size={15} /> 닉네임 정하기
        </h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          챌린지에서 사용할 닉네임을 정해주세요. 인증 현황에 이 이름으로
          표시됩니다.
        </p>
        {errorBox}
        <input
          className="text-input"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="닉네임 (20자 이내)"
          maxLength={20}
          autoFocus
        />
        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 10 }}
          onClick={handleJoin}
          disabled={busy || !nickname.trim()}
        >
          {busy ? '등록 중…' : '이 닉네임으로 참여하기'}
        </button>
        <p className="muted small challenge-whoami">
          {user.email} ·{' '}
          <button className="link-button" onClick={() => signOut()}>
            다른 계정으로 로그인
          </button>
        </p>
      </div>
    );
  }

  /* ------------------------------ kicked out ------------------------------ */
  if (me.status === 'out') {
    return (
      <div className="card challenge-card">
        <h2 className="section-title">
          <UsersIcon size={15} /> 챌린지 참여 종료
        </h2>
        <p className="notice notice-danger">
          <AlertIcon size={16} />
          <span>
            {me.kickReason === 'kickout'
              ? `누적 미인증 ${CHALLENGE_CONFIG.kickoutThreshold}회로 킥아웃되어 더 이상 인증을 제출할 수 없습니다.`
              : '이번 챌린지 참여가 종료되어 더 이상 인증을 제출할 수 없습니다.'}{' '}
            문의사항은 운영진에게 연락해주세요.
          </span>
        </p>
      </div>
    );
  }

  /* ------------------------------ certifying ------------------------------ */
  const tag = stat ? riskTag(stat) : null;

  return (
    <div className="card challenge-card">
      <h2 className="section-title">
        <UsersIcon size={15} /> 오늘의 인증
      </h2>
      {editingNick ? (
        <div className="nickname-edit">
          <input
            className="text-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            placeholder="새 닉네임 (20자 이내)"
            maxLength={20}
            autoFocus
          />
          <button className="btn btn-sm btn-primary" onClick={handleRename} disabled={busy}>
            저장
          </button>
          <button className="btn btn-sm" onClick={() => setEditingNick(false)}>
            취소
          </button>
        </div>
      ) : (
        <p className="muted small challenge-whoami">
          <strong>{me.nickname}</strong>님으로 인증 중 ·{' '}
          <button
            className="link-button"
            onClick={() => {
              setNickname(me.nickname);
              setEditingNick(true);
            }}
          >
            닉네임 변경
          </button>{' '}
          ·{' '}
          <button className="link-button" onClick={() => signOut()}>
            로그아웃
          </button>
        </p>
      )}

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

      {errorBox}

      {stat?.submittedToday ? (
        <div className="checkin-done">
          <span className="checkin-done-mark">
            <CheckIcon size={20} />
          </span>
          <div>
            <strong>오늘 인증 완료!</strong>
            <span className="muted small">내일 또 만나요 — 주 7일 인증이 목표예요.</span>
          </div>
        </div>
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
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? '저장 중…' : '오늘 인증하기'}
          </button>
        </>
      )}

      {message && (
        <p className="small share-message">
          <CheckIcon size={14} /> {message}
        </p>
      )}
    </div>
  );
}
