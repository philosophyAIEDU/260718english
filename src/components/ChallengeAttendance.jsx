import { useEffect, useState } from 'react';
import { getSetting } from '../lib/db.js';
import { isFirebaseConfigured, CHALLENGE_CONFIG } from '../lib/challengeConfig.js';
import { listParticipants, listSubmissions } from '../lib/challengeStore.js';
import { buildStats, riskTag, shortLabel, today } from '../lib/challengeUtils.js';
import { CalendarIcon } from './Icons.jsx';

const STATUS_LABEL = { O: '인증', X: '미인증', P: '면제', '-': '진행 전', '·': '기간 밖' };

/**
 * Compact O/X/P attendance calendar for the whole [Read & Build] challenge
 * window, for the participant this device is registered as. Renders
 * nothing until Firebase is configured and a participant has been chosen
 * on the Home screen.
 */
export default function ChallengeAttendance() {
  if (!isFirebaseConfigured()) return null;
  return <ChallengeAttendanceInner />;
}

function ChallengeAttendanceInner() {
  const [stat, setStat] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getSetting('challengeParticipantId').then(async (id) => {
      if (!id) {
        if (alive) setReady(true);
        return;
      }
      try {
        const [participants, subs] = await Promise.all([
          listParticipants(),
          listSubmissions({ participantId: id }),
        ]);
        const me = participants.find((p) => p.id === id);
        if (alive && me) setStat(buildStats([me], subs, today())[0]);
      } catch {
        /* Progress screen still works without the challenge card. */
      } finally {
        if (alive) setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!ready || !stat) return null;

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
