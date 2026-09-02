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
  getSubmission,
  saveSubmission,
} from '../lib/challengeStore.js';
import { today, dateRange, dayIndex, shortLabel, isLate, buildStats, riskTag } from '../lib/challengeUtils.js';
import { detectInAppBrowser, openInExternalBrowser } from '../lib/inAppBrowser.js';
import {
  BookOpenIcon,
  SpeakerIcon,
  CheckIcon,
  AlertIcon,
  UsersIcon,
  GoogleIcon,
  ExternalLinkIcon,
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
  const [selectedDate, setSelectedDate] = useState(today());
  const [existing, setExisting] = useState(undefined); // undefined = loading, null = none yet
  const [editingSubmission, setEditingSubmission] = useState(false);
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

  // Which dates this participant is even allowed to certify for: from
  // whichever is later of their join date or the challenge start, through
  // today. Mirrors 260818comingssoni's "인증할 날짜" picker — it exists so a
  // submission made just after midnight can still be filed under the
  // correct day instead of silently landing on the wrong one.
  const certifyDates = me ? dateRange(me.joinDate > todayISO ? todayISO : me.joinDate, todayISO) : [];

  // Load (or clear) the selected date's existing entry whenever the
  // participant or the chosen date changes, so re-opening a past date the
  // learner already certified shows what they submitted instead of a blank
  // form that would silently overwrite it.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    setExisting(undefined);
    setEditingSubmission(false);
    getSubmission(me.id, selectedDate)
      .then((sub) => {
        if (!alive) return;
        setExisting(sub);
        setMode(sub?.mode || 'read');
        setBookTitle(sub?.bookTitle || '');
      })
      .catch(() => alive && setExisting(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, selectedDate]);

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

  const handleSubmit = () => {
    // saveSubmission's result — not the `existing` state, which run()'s
    // onDone would otherwise read from a stale closure — decides whether
    // the message below reports a late submission.
    let saved;
    return run(
      async () => {
        saved = await saveSubmission({
          participantId: me.id,
          nickname: me.nickname,
          date: selectedDate,
          mode,
          bookTitle: bookTitle.trim(),
        });
        setExisting(saved);
        if (selectedDate === todayISO) {
          const before = await getAllActivity();
          if (!isActiveToday(before.map((a) => a.date))) {
            await logActivity({ source: mode === 'listen' ? 'listen' : 'checkin' });
          }
        }
        refreshStat(me);
      },
      () => {
        const late = isLate(selectedDate, saved.createdAt);
        const verb = mode === 'listen' ? '듣기' : '읽기';
        setMessage(
          late
            ? `${shortLabel(selectedDate)} 인증을 저장했어요. 다만 마감을 넘겨 미인증(X)으로 집계돼요.`
            : `${selectedDate === todayISO ? '오늘의' : shortLabel(selectedDate)} ${verb} 인증 완료! ${mode === 'listen' ? '🎧' : '📖'}`
        );
      }
    );
  };

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

      {certifyDates.length > 1 && (
        <>
          <label className="field-label" htmlFor="certify-date">
            인증할 날짜
          </label>
          <select
            id="certify-date"
            className="text-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {[...certifyDates].reverse().map((d) => (
              <option key={d} value={d}>
                {dayIndex(d) ? `${dayIndex(d)}일차 · ` : ''}
                {shortLabel(d)}
                {d === todayISO ? ' · 오늘' : ''}
              </option>
            ))}
          </select>
          {selectedDate !== todayISO && (
            <p className="notice notice-warn" style={{ marginTop: 8 }}>
              <AlertIcon size={16} />
              <span>
                이 날짜는 이미 마감이 지나서, 지금 제출해도 미인증(X)으로 집계돼요. 오늘
                날짜로 인증하려면 위에서 &quot;오늘&quot;을 선택하세요.
              </span>
            </p>
          )}
        </>
      )}

      {existing === undefined ? (
        <div className="skeleton skeleton-line w-60" style={{ marginTop: 12 }} />
      ) : existing && !editingSubmission ? (
        <div className="checkin-done">
          <span className="checkin-done-mark">
            <CheckIcon size={20} />
          </span>
          <div>
            <strong>
              {selectedDate === todayISO ? '오늘 인증 완료!' : `${shortLabel(selectedDate)} 인증 완료`}
            </strong>
            <span className="muted small">
              {existing.mode === 'listen' ? '들었어요' : '읽었어요'}
              {existing.bookTitle ? ` · ${existing.bookTitle}` : ''} ·{' '}
              <button className="link-button" onClick={() => setEditingSubmission(true)}>
                수정하기
              </button>
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="mode-toggle" role="group" aria-label="읽었나요, 들었나요">
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
            placeholder="읽거나 들은 책 제목 (선택)"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
          />
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 10 }}
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? '저장 중…' : existing ? '인증 수정하기' : selectedDate === todayISO ? '오늘 인증하기' : '인증하기'}
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
