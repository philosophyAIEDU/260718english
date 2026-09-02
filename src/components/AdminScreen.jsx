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
import {
  ArrowLeftIcon,
  ShieldIcon,
  AlertIcon,
  UsersIcon,
  CalendarIcon,
  TrashIcon,
} from './Icons.jsx';

/**
 * Organizer dashboard: who missed how many days, who is at risk of the
 * kickout rule (CHALLENGE_CONFIG.kickoutThreshold), and what to do about
 * it (exempt a date, kick out, reinstate, remove). Participants add
 * themselves by signing in and picking a nickname, so there's no roster to
 * enter here.
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
      <div className="screen-heading">
        <h2>운영자 대시보드</h2>
        <button className="link-button" onClick={() => signOut()}>
          로그아웃 ({user.email})
        </button>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'matrix' ? 'active' : ''}`} onClick={() => setTab('matrix')}>
          <CalendarIcon size={15} /> 일일현황
        </button>
        <button className={`admin-tab ${tab === 'roster' ? 'active' : ''}`} onClick={() => setTab('roster')}>
          <UsersIcon size={15} /> 명단 관리
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
    </section>
  );
}
