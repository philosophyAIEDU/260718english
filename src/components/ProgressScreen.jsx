import { useEffect, useState } from 'react';
import { getAllActivity, getAllVocab, getAllBookProgress, getSetting } from '../lib/db.js';
import { computeStats } from '../lib/statsUtils.js';
import { recentDayGrid } from '../lib/streaks.js';
import { evaluateBadges } from '../lib/badges.js';
import { renderProgressCard, shareOrDownloadCard } from '../lib/progressCard.js';
import ChallengeAttendance from './ChallengeAttendance.jsx';
import { FlameIcon, TrophyIcon, ShareIcon, CheckIcon, AlertIcon } from './Icons.jsx';

/**
 * Progress hub: streak, a 5-week activity grid, badge collection, and a
 * one-tap "share my progress" card for group reading challenges. Nothing
 * here ever leaves the device except the image the learner chooses to
 * share or download.
 */
export default function ProgressScreen() {
  const [stats, setStats] = useState(null);
  const [grid, setGrid] = useState([]);
  const [badges, setBadges] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [currentBook, setCurrentBook] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getAllActivity(), getAllVocab(), getAllBookProgress(), getSetting('theme')]).then(
      ([activity, vocab, bookProgress, theme]) => {
        if (!alive) return;
        const s = computeStats({ activity, vocab, bookProgress });
        setStats({ ...s, theme: theme || 'light' });
        setGrid(recentDayGrid(activity.map((a) => a.date)));
        setBadges(evaluateBadges(s));
        const inProgress = bookProgress
          .filter((b) => !b.bookCompleted)
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
        setCurrentBook(inProgress || null);
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  const handleShare = async () => {
    if (!stats || sharing) return;
    setSharing(true);
    setShareMessage('');
    try {
      const blob = await renderProgressCard({
        streak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        vocabCount: stats.vocabCount,
        booksCompleted: stats.booksCompleted,
        bookTitle: currentBook?.bookTitle,
        chapterTitle: currentBook ? `Chapter ${currentBook.chapterIndex + 1}` : '',
        theme: stats.theme,
      });
      const result = await shareOrDownloadCard(blob, 'readmate-progress.png');
      setShareMessage(
        result === 'shared'
          ? 'Shared!'
          : result === 'downloaded'
          ? 'Saved — share it in your challenge chat!'
          : ''
      );
    } catch {
      setShareMessage('Could not create the image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  if (!stats) {
    return (
      <div className="card">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line w-80" />
      </div>
    );
  }

  return (
    <section>
      <div className="screen-heading">
        <h2>Progress</h2>
      </div>

      <div className="card streak-hero">
        <div className="streak-hero-number">
          <FlameIcon size={30} />
          <span>{stats.currentStreak}</span>
        </div>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          day{stats.currentStreak === 1 ? '' : 's'} in a row · longest {stats.longestStreak}
        </p>

        <div className="day-grid">
          {grid.map((d) => (
            <span
              key={d.date}
              className={`day-dot ${d.active ? 'active' : ''} ${d.isToday ? 'today' : ''}`}
              title={d.date}
            />
          ))}
        </div>

        <button className="btn btn-primary btn-block" onClick={handleShare} disabled={sharing}>
          <ShareIcon size={16} /> {sharing ? 'Creating…' : 'Share my progress'}
        </button>
        {shareMessage && (
          <p className="small share-message">
            {shareMessage.startsWith('Could not') ? <AlertIcon size={14} /> : <CheckIcon size={14} />}{' '}
            {shareMessage}
          </p>
        )}
      </div>

      <ChallengeAttendance />

      <div className="stat-row">
        <div className="stat-tile">
          <strong>{stats.vocabCount}</strong>
          <span>Words Saved</span>
        </div>
        <div className="stat-tile">
          <strong>{stats.chaptersCompleted}</strong>
          <span>Chapters Read</span>
        </div>
        <div className="stat-tile">
          <strong>{stats.booksCompleted}</strong>
          <span>Books Finished</span>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">
          <TrophyIcon size={15} /> Badges
        </h2>
        <div className="badge-grid">
          {badges.map((b) => (
            <div className={`badge-tile ${b.earned ? 'earned' : ''}`} key={b.id}>
              <span className="badge-icon">
                <TrophyIcon size={20} />
              </span>
              <strong>{b.title}</strong>
              <span className="small muted">{b.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
