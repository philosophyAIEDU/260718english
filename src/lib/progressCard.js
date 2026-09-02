/*
 * Renders a shareable "progress card" PNG on a canvas — for posting a
 * reading-challenge update to a group chat without exposing any book
 * content, page photos, or personal data. Everything is drawn locally;
 * nothing is uploaded anywhere.
 */

const WIDTH = 1080;
const HEIGHT = 1350; // 4:5, friendly for most chat apps and Instagram

// Mirrors the Philosophy AI Education brand palette used in global.css.
const PALETTE = {
  light: {
    bg: '#fff7e3',
    card: '#ffffff',
    text: '#35270d',
    soft: '#6b5334',
    accent: '#a5720a',
    gold: '#d99a1a',
  },
  dark: {
    bg: '#1d1608',
    card: '#261c0d',
    text: '#f7ecd2',
    soft: '#cdb68e',
    accent: '#d9a227',
    gold: '#e8b83f',
  },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {object} data
 *   { streak, longestStreak, vocabCount, booksCompleted, bookTitle,
 *     chapterTitle, theme: 'light'|'dark' }
 * @returns {Promise<Blob>} PNG blob
 */
export async function renderProgressCard(data) {
  const c = PALETTE[data.theme === 'dark' ? 'dark' : 'light'];
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Brand mark + name
  const pad = 72;
  drawBrandMark(ctx, pad, 88, 76, c);
  ctx.fillStyle = c.text;
  ctx.font = '700 46px Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Read & Build', pad + 96, 126);
  ctx.fillStyle = c.soft;
  ctx.font = '500 26px -apple-system, sans-serif';
  ctx.fillText('ENGLISH READING CHALLENGE', pad + 96, 168);

  // Streak hero number
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = c.accent;
  ctx.font = '800 220px Georgia, serif';
  ctx.fillText(String(data.streak), pad, 500);
  const streakNumWidth = ctx.measureText(String(data.streak)).width;

  ctx.fillStyle = c.text;
  ctx.font = '600 44px -apple-system, sans-serif';
  ctx.fillText(
    data.streak === 1 ? 'day streak' : 'day streak',
    pad + streakNumWidth + 24,
    460
  );
  ctx.fillStyle = c.soft;
  ctx.font = '400 32px -apple-system, sans-serif';
  ctx.fillText(`Longest streak: ${data.longestStreak} days`, pad + streakNumWidth + 24, 505);

  // Divider
  ctx.strokeStyle = c.soft;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(pad, 560);
  ctx.lineTo(WIDTH - pad, 560);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Currently reading card
  let y = 610;
  if (data.bookTitle) {
    ctx.fillStyle = c.soft;
    ctx.font = '600 28px -apple-system, sans-serif';
    ctx.fillText('CURRENTLY READING', pad, y);
    y += 52;
    ctx.fillStyle = c.text;
    ctx.font = 'italic 600 42px Georgia, serif';
    const titleLines = wrapText(ctx, data.bookTitle, WIDTH - pad * 2);
    for (const line of titleLines) {
      ctx.fillText(line, pad, y);
      y += 52;
    }
    if (data.chapterTitle) {
      ctx.fillStyle = c.soft;
      ctx.font = '400 32px Georgia, serif';
      ctx.fillText(data.chapterTitle, pad, y);
      y += 50;
    }
    y += 30;
  }

  // Stat tiles
  const stats = [
    { label: 'Words Saved', value: String(data.vocabCount) },
    { label: 'Books Finished', value: String(data.booksCompleted) },
  ];
  const tileW = (WIDTH - pad * 2 - 24) / 2;
  const tileH = 170;
  stats.forEach((s, i) => {
    const x = pad + i * (tileW + 24);
    ctx.fillStyle = c.card;
    roundRect(ctx, x, y, tileW, tileH, 24);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.font = '800 64px Georgia, serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s.value, x + 32, y + 90);
    ctx.fillStyle = c.soft;
    ctx.font = '500 28px -apple-system, sans-serif';
    ctx.fillText(s.label, x + 32, y + 135);
  });
  y += tileH + 60;

  // Footer
  ctx.fillStyle = c.soft;
  ctx.font = '400 26px -apple-system, sans-serif';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  ctx.fillText(dateStr, pad, HEIGHT - 60);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function drawBrandMark(ctx, x, y, size, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c.accent;
  roundRect(ctx, 0, 0, size, size, size * 0.25);
  ctx.fill();
  ctx.strokeStyle = c.bg;
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = size / 48;
  ctx.beginPath();
  ctx.moveTo(24 * s, 14 * s);
  ctx.bezierCurveTo(20 * s, 11.2 * s, 14 * s, 11 * s, 11.6 * s, 12.4 * s);
  ctx.lineTo(11.6 * s, 32.4 * s);
  ctx.bezierCurveTo(14 * s, 31 * s, 20 * s, 31.2 * s, 24 * s, 34 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(24 * s, 14 * s);
  ctx.bezierCurveTo(28 * s, 11.2 * s, 34 * s, 11 * s, 36.4 * s, 12.4 * s);
  ctx.lineTo(36.4 * s, 32.4 * s);
  ctx.bezierCurveTo(34 * s, 31 * s, 28 * s, 31.2 * s, 24 * s, 34 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(24 * s, 14 * s);
  ctx.lineTo(24 * s, 34 * s);
  ctx.stroke();
  ctx.restore();
}

/** Trigger a download of the rendered card as a PNG file. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Share the card via the Web Share API when available (mobile browsers),
 * otherwise fall back to a plain download.
 */
export async function shareOrDownloadCard(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'My Read & Build progress',
        text: 'My English reading challenge progress 📖',
      });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // fall through to download on any other share failure
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
