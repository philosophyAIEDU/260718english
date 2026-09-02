import { useEffect, useState } from 'react';
import { isFirebaseConfigured, CHALLENGE_CONFIG } from '../lib/challengeConfig.js';
import { onAuthReady, getMyParticipant, listSubmissions } from '../lib/challengeStore.js';
import { buildStats, riskTag, shortLabel, today } from '../lib/challengeUtils.js';
import { CalendarIcon } from './Icons.jsx';

const STATUS_LABEL = { O: '인증', X: '미인증', P: '면제', '-': '진행 전', '·': '기간 밖' };

/**
 * Compact O/X/P attendance calendar for the whole [Read & Build] challenge
 * window, for the signed-in participant. Renders nothing until Firebase is
 * configured and the viewer has joined the challenge on the Home screen.
 */
export default function ChallengeAttendance() {
  if (!isFirebaseConfigured()) return null;
  return <ChallengeAttendanceInner />;
}

function ChallengeAttendanceInner() {
  const [stat, setStat] = useState(null);

  useEffect(() => {
    let alive = true;
    const unsubscribe = onAuthReady(async (user) => {
      if (!user) {
        if (alive) setStat(null);
        return;
      }
      try {
        const me = await getMyParticipant();
        if (!me) {
          if (alive) setStat(null);
          return;
        }
        const subs = await listSubmissions({ participantId: me.id });
        if (alive) setStat(buildStats([me], subs, today())[0]);
      } catch {
        /* Progress screen still works without the challenge card. */
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  if (!stat) return null;

  const tag = riskTag(stat);
  return (
    <div className="card">
      <h2 className="section-title">
        <CalendarIcon size={15} /> {CHALLENGE_CONFIG.title} 인증 캘린더
      </h2>
      <div className={`challenge-stat-row tone-${tag.tone}`} style={{ marginBottom: 10 }}>
        <span>인증 {stat.verified}</span>
        <span>미인증 {stat.missed}</span>
        <span>면제 {stat.exempt}</span>
        <span>인증률 {stat.rate}%</span>
        <span className="challenge-tag">{tag.label}</span>
      </div>
      <div className="attendance-grid">
        {stat.cells.map((c) => (
          <span
            key={c.date}
            className={`attendance-dot status-${c.status === '·' ? 'blank' : c.status}`}
            title={`${shortLabel(c.date)} · ${STATUS_LABEL[c.status]}`}
          >
            {c.status === 'O' || c.status === 'X' || c.status === 'P' ? c.status : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
