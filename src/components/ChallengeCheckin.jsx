import { useEffect, useState } from 'react';
import { isFirebaseConfigured, CHALLENGE_CONFIG } from '../lib/challengeConfig.js';
import {
  onAuthReady,
  signInWithGoogle,
  signOut,
  getMyParticipant,
  registerParticipant,
  updateMyNickname,
  listSubmissions,
  getSubmission,
} from '../lib/challengeStore.js';
import { today, dayIndex, shortLabel, isHoliday, buildStats, riskTag } from '../lib/challengeUtils.js';
import { detectInAppBrowser, openInExternalBrowser } from '../lib/inAppBrowser.js';
import {
  BookOpenIcon,
  SpeakerIcon,
  CheckIcon,
  AlertIcon,
  UsersIcon,
  GoogleIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
} from './Icons.jsx';

/**
 * The daily check-in status, and the gate in front of it.
 *
 * A participant signs in with Google once and picks a nickname; that
 * creates their entry under their account, so the organizer never
 * maintains a roster and nobody can certify as someone else.
 *
 * There is deliberately no "그냥 눌러서 인증" button here — certifying a day
 * only happens by actually reading or listening to that day's assigned
 * pages in the Library reader (see BookReaderScreen's auto-checkin), so
 * this card is read-only: it shows whether today is certified yet and, if
 * not, points straight at the Library.
 *
 * Renders nothing when CHALLENGE_CONFIG.firebase.projectId is empty, so a
 * deployment that isn't running this cohort is unaffected.
 */
export default function ChallengeCheckin({ onGoLibrary }) {
  if (!isFirebaseConfigured()) return null;
  return <ChallengeCheckinInner onGoLibrary={onGoLibrary} />;
}

function ChallengeCheckinInner({ onGoLibrary }) {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [me, setMe] = useState(undefined); // undefined = not loaded, null = not joined
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nickname, setNickname] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [stat, setStat] = useState(null);
  const [existing, setExisting] = useState(undefined); // undefined = loading, null = none yet
  const [inApp] = useState(detectInAppBrowser);
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

  // Today's certification status — set by the Library reader's auto-checkin,
  // never by this card. Reloads whenever this screen (re)mounts, e.g.
  // coming back from a reading/listening session.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    setExisting(undefined);
    getSubmission(me.id, todayISO)
      .then((sub) => alive && setExisting(sub))
      .catch(() => alive && setExisting(null));
    return () => {
      alive = false;
    };
  }, [me, todayISO]);

  const run = async (action, onDone) => {
    if (busy) return;
    setBusy(true);
    setError('');
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
      () => {}
    );

  const handleRename = () =>
    run(
      async () => {
        const nick = await updateMyNickname(nickname);
        setMe((prev) => ({ ...prev, nickname: nick }));
      },
      () => setEditingNick(false)
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
          구글 계정으로 로그인하고 닉네임만 정하면 바로 참여할 수 있어요. 라이브러리에서
          매일 배정된 분량을 읽거나 들으면 자동으로 인증됩니다.
        </p>
        {errorBox}
        {inApp ? (
          // Google refuses to run its sign-in inside these embedded
          // browsers no matter what this app does, so a sign-in button
          // here would just fail — pointing at the way out is the only
          // thing that actually works.
          <div className="notice notice-warn">
            <AlertIcon size={16} />
            <div>
              <span>
                {inApp.label} 안에서는 구글 로그인이 막혀 있어요. 아래 버튼으로 기본
                브라우저에서 열어주세요.
              </span>
              {inApp.id === 'kakaotalk' ? (
                <button
                  className="btn btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={openInExternalBrowser}
                >
                  <ExternalLinkIcon size={14} /> 기본 브라우저에서 열기
                </button>
              ) : (
                <p className="muted small" style={{ margin: '8px 0 0' }}>
                  오른쪽 위 메뉴(⋮ 또는 …)에서 &quot;다른 브라우저로 열기&quot;를
                  선택해주세요.
                </p>
              )}
            </div>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" onClick={handleSignIn} disabled={busy}>
            <GoogleIcon size={17} /> {busy ? '연결 중…' : 'Google로 시작하기'}
          </button>
        )}
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
      {isHoliday(todayISO) && (
        <p className="notice">
          <UsersIcon size={16} />
          <span>
            오늘은 연휴라 인증하지 않아도 미인증으로 집계되지 않아요. 그래도 읽거나
            들으셨다면 자동으로 인증됩니다.
          </span>
        </p>
      )}
      {stat && stat.atRisk && !stat.kickoutEligible && (
        <p className="notice notice-warn">
          <AlertIcon size={16} />
          <span>
            누적 미인증 {stat.missed}회 — {CHALLENGE_CONFIG.kickoutThreshold}회가 되면
            킥아웃 대상이 돼요. 오늘 꼭 읽거나 들어보세요!
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

      {existing === undefined ? (
        <div className="skeleton skeleton-line w-60" style={{ marginTop: 12 }} />
      ) : existing ? (
        <div className="checkin-done">
          <span className="checkin-done-mark">
            <CheckIcon size={20} />
          </span>
          <div>
            <strong>오늘 인증 완료!{dayIndex(todayISO) ? ` (Day ${dayIndex(todayISO)})` : ''}</strong>
            <span className="muted small">
              {existing.mode === 'listen' ? (
                <>
                  <SpeakerIcon size={12} /> 들었어요
                </>
              ) : (
                <>
                  <BookOpenIcon size={12} /> 읽었어요
                </>
              )}
              {existing.bookTitle ? ` · ${existing.bookTitle}` : ''}
            </span>
          </div>
        </div>
      ) : (
        <div className="checkin-pending">
          <p className="checkin-pending-lead">
            <strong>{shortLabel(todayISO)} 아직 인증되지 않았어요.</strong>
          </p>
          <p className="muted small" style={{ margin: '4px 0 12px' }}>
            버튼을 눌러서 인증하는 게 아니에요 — 라이브러리에서 오늘 배정된 분량을
            끝까지 읽거나 들으면 그 순간 자동으로 인증됩니다.
          </p>
          {onGoLibrary && (
            <button className="btn btn-primary btn-block" onClick={onGoLibrary}>
              <BookOpenIcon size={16} /> 라이브러리에서 읽거나 듣기 <ArrowRightIcon size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
