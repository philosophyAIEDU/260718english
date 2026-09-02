import { useEffect, useState } from 'react';
import { CHALLENGE_CONFIG, isFirebaseConfigured } from '../lib/challengeConfig.js';
import {
  onAuthReady,
  signInWithGoogle,
  signOut,
  isAdminEmail,
  listParticipants,
  updateParticipant,
  removeParticipant,
  listSubmissions,
} from '../lib/challengeStore.js';
import { challengeDates, buildStats, riskTag, shortLabel, today } from '../lib/challengeUtils.js';
import { buildDailyNotice } from '../lib/noticeTemplate.js';
import { copyText } from '../lib/clipboard.js';
import {
  ArrowLeftIcon,
  ShieldIcon,
  AlertIcon,
  UsersIcon,
  CalendarIcon,
  MessageIcon,
  CopyIcon,
  RotateIcon,
  TrashIcon,
} from './Icons.jsx';

/**
 * Organizer dashboard — its own section, separate in look and in access
 * from the participant-facing screens: a dark stat-header like the intro
 * hero (but tagged "운영진 전용" instead of the challenge branding), then
 * three tabs:
 *
 *   일일현황  — attendance matrix, sorted by who's missed the most
 *   명단 관리 — exempt a date, kick out / reinstate, remove
 *   공지 문구 — today's KakaoTalk message, generated and ready to copy
 *
 * Gated by Firebase Google sign-in against CHALLENGE_CONFIG.adminEmails —
 * the client-side check keeps the dashboard hidden from participants, but
 * the real protection lives in Firestore security rules (see README).
 */
export default function AdminScreen({ onBack }) {
  if (!isFirebaseConfigured()) {
    return (
      <section>
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> Back
        </button>
        <div className="notice">
          <AlertIcon size={18} />
          <span>
            아직 Firebase가 설정되지 않았어요. src/lib/challengeConfig.js에 Firebase 프로젝트
            정보를 채워야 관리자 화면을 쓸 수 있습니다.
          </span>
        </div>
      </section>
    );
  }
  return <AdminScreenInner onBack={onBack} />;
}

function AdminScreenInner({ onBack }) {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState('matrix');
  const [participants, setParticipants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [noticeText, setNoticeText] = useState(() => buildDailyNotice());
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => onAuthReady(setUser), []);

  const admin = user && isAdminEmail(user.email);

  const loadData = () => {
    setLoadingData(true);
    Promise.all([listParticipants(), listSubmissions()])
      .then(([p, s]) => {
        setParticipants(p);
        setSubmissions(s);
      })
      .finally(() => setLoadingData(false));
  };

  useEffect(() => {
    if (admin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch {
      setAuthError('로그인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleCopyNotice = async () => {
    setCopyMessage('');
    const ok = await copyText(noticeText);
    setCopyMessage(ok ? '복사했어요! 단톡방에 붙여넣으세요.' : '복사에 실패했어요. 직접 선택해서 복사해주세요.');
  };

  if (user === undefined) {
    return (
      <section>
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> Back
        </button>
        <div className="skeleton skeleton-line w-60" />
      </section>
    );
  }

  if (!admin) {
    return (
      <section>
        <button className="back-link" onClick={onBack}>
          <ArrowLeftIcon size={16} /> Back
        </button>
        <div className="card">
          <h2 className="section-title">
            <ShieldIcon size={16} /> 운영자 로그인
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            {CHALLENGE_CONFIG.title} 참가자 인증 현황을 보려면 운영진 구글 계정으로
            로그인해주세요.
          </p>
          {user && !isAdminEmail(user.email) && (
            <div className="error-box">
              <AlertIcon size={17} />
              <span>{user.email}은(는) 관리자 계정이 아니에요.</span>
            </div>
          )}
          {authError && (
            <div className="error-box">
              <AlertIcon size={17} />
              <span>{authError}</span>
            </div>
          )}
          <button className="btn btn-primary btn-block" onClick={handleSignIn} disabled={signingIn}>
            {signingIn ? '로그인 중…' : 'Google로 로그인'}
          </button>
          {user && (
            <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => signOut()}>
              로그아웃
            </button>
          )}
        </div>
      </section>
    );
  }

  const stats = buildStats(participants, submissions, today());
  const sortedByMissed = [...stats].sort((a, b) => b.missed - a.missed);
  const dates = challengeDates();
  const certifiedToday = stats.filter((s) => s.submittedToday).length;
  const atRiskCount = stats.filter((s) => s.atRisk && !s.kickoutEligible).length;
  const kickoutCount = stats.filter((s) => s.kickoutEligible).length;

  const toggleExemptToday = async (stat) => {
    const t = today();
    const p = stat.participant;
    const dates2 = p.exemptDates || [];
    const next = dates2.includes(t) ? dates2.filter((d) => d !== t) : [...dates2, t];
    await updateParticipant(p.id, { exemptDates: next });
    loadData();
  };

  const handleOut = async (stat) => {
    const p = stat.participant;
    const label = stat.kickoutEligible ? '킥아웃' : '아웃';
    if (!window.confirm(`${p.nickname}님을 ${label} 처리할까요?`)) return;
    await updateParticipant(p.id, {
      status: 'out',
      outDate: today(),
      kickReason: stat.kickoutEligible ? 'kickout' : 'manual',
    });
    loadData();
  };

  const handleReinstate = async (stat) => {
    await updateParticipant(stat.participant.id, { status: 'active', outDate: null, kickReason: null });
    loadData();
  };

  const handleRemove = async (stat) => {
    if (!window.confirm(`${stat.participant.nickname}님을 명단에서 완전히 삭제할까요? (인증 기록도 함께 삭제됩니다)`)) return;
    await removeParticipant(stat.participant.id);
    loadData();
  };

  return (
    <section>
      <button className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={16} /> Back
      </button>

      <div className="hero">
        <p className="hero-eyebrow">
          <ShieldIcon size={13} /> 운영진 전용
        </p>
        <h1 className="hero-title" style={{ fontSize: '1.3rem' }}>
          {CHALLENGE_CONFIG.title} 대시보드
        </h1>
        <p className="hero-lead">{user.email}로 로그인됨</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <strong>{participants.length}</strong>
            <span>참가자</span>
          </div>
          <div className="hero-stat">
            <strong>{certifiedToday}</strong>
            <span>오늘 인증</span>
          </div>
          <div className="hero-stat is-warn">
            <strong>{atRiskCount}</strong>
            <span>위험군</span>
          </div>
          <div className="hero-stat is-bad">
            <strong>{kickoutCount}</strong>
            <span>킥아웃 대상</span>
          </div>
        </div>
      </div>

      <button className="link-button" style={{ marginBottom: 14 }} onClick={() => signOut()}>
        로그아웃
      </button>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'matrix' ? 'active' : ''}`} onClick={() => setTab('matrix')}>
          <CalendarIcon size={15} /> 일일현황
        </button>
        <button className={`admin-tab ${tab === 'roster' ? 'active' : ''}`} onClick={() => setTab('roster')}>
          <UsersIcon size={15} /> 명단 관리
        </button>
        <button className={`admin-tab ${tab === 'notice' ? 'active' : ''}`} onClick={() => setTab('notice')}>
          <MessageIcon size={15} /> 공지 문구
        </button>
      </div>

      {loadingData && <div className="skeleton skeleton-line w-60" />}

      {!loadingData && tab === 'matrix' && (
        <div className="card">
          <p className="muted small" style={{ marginTop: 0 }}>
            누적 미인증 {CHALLENGE_CONFIG.riskThreshold}회부터 위험, {CHALLENGE_CONFIG.kickoutThreshold}
            회부터 킥아웃 대상입니다. 오늘은 24시 마감 전이라 아직 미인증으로 확정하지 않아요.
          </p>
          <div className="matrix-scroll">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="matrix-name-col">이름</th>
                  <th>미인증</th>
                  <th>상태</th>
                  {dates.map((d) => (
                    <th key={d} title={d}>
                      {shortLabel(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedByMissed.map((s) => {
                  const tag = riskTag(s);
                  return (
                    <tr key={s.participant.id}>
                      <td className="matrix-name-col">{s.participant.nickname}</td>
                      <td>{s.missed}</td>
                      <td>
                        <span className={`challenge-tag tone-${tag.tone}`}>{tag.label}</span>
                      </td>
                      {s.cells.map((c) => (
                        <td key={c.date} className={`matrix-cell status-${c.status === '·' ? 'blank' : c.status}`}>
                          {c.status === 'O' || c.status === 'X' || c.status === 'P' ? c.status : ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loadingData && tab === 'roster' && (
        <>
          <div className="notice">
            <UsersIcon size={18} />
            <span>
              참가자는 앱 홈 화면에서 <strong>구글 로그인 후 닉네임</strong>을 정하면 스스로
              등록됩니다. 여기서는 등록된 분들의 면제일·킥아웃만 관리하시면 됩니다.
            </span>
          </div>

          <div className="card">
            <h2 className="section-title">참가자 ({participants.length}명)</h2>
            <div className="roster-list">
              {sortedByMissed.map((s) => {
                const tag = riskTag(s);
                const p = s.participant;
                const exemptToday = (p.exemptDates || []).includes(today());
                return (
                  <div className="roster-row" key={p.id}>
                    <div className="roster-row-main">
                      <strong>{p.nickname}</strong>
                      <span className={`challenge-tag tone-${tag.tone}`}>{tag.label}</span>
                      <span className="muted small">
                        인증 {s.verified} · 미인증 {s.missed} · 연속 {s.streak}일
                        {p.email ? ` · ${p.email}` : ''}
                      </span>
                    </div>
                    <div className="roster-row-actions">
                      <button className="btn btn-sm" onClick={() => toggleExemptToday(s)}>
                        {exemptToday ? '오늘 면제 해제' : '오늘 면제'}
                      </button>
                      {p.status === 'out' ? (
                        <button className="btn btn-sm" onClick={() => handleReinstate(s)}>
                          복귀
                        </button>
                      ) : (
                        <button
                          className={`btn btn-sm ${s.kickoutEligible ? 'btn-danger' : ''}`}
                          onClick={() => handleOut(s)}
                        >
                          {s.kickoutEligible ? '킥아웃 처리' : '아웃 처리'}
                        </button>
                      )}
                      <button className="icon-button" onClick={() => handleRemove(s)} aria-label="삭제" title="삭제">
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!loadingData && tab === 'notice' && (
        <div className="card">
          <h2 className="section-title">
            <MessageIcon size={15} /> 오늘의 공지 문구
          </h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            챌린지 단톡방에 그대로 붙여넣을 수 있는 안내 문구예요. 오늘 날짜와 이번 주 수업
            정보로 자동으로 채워지며, 자유롭게 고쳐서 쓰셔도 됩니다.
            {!CHALLENGE_CONFIG.appUrl && (
              <>
                {' '}
                <code>challengeConfig.js</code>의 <code>appUrl</code>을 채우면 인증 링크도
                함께 들어가요.
              </>
            )}
          </p>
          <textarea
            className="text-input notice-textarea"
            rows={10}
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCopyNotice}>
              <CopyIcon size={16} /> 복사하기
            </button>
            <button
              className="btn"
              onClick={() => {
                setNoticeText(buildDailyNotice());
                setCopyMessage('');
              }}
            >
              <RotateIcon size={15} /> 다시 만들기
            </button>
          </div>
          {copyMessage && <p className="small share-message">{copyMessage}</p>}
        </div>
      )}
    </section>
  );
}
