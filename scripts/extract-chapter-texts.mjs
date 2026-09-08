#!/usr/bin/env node
/*
 * Dumps one plain-text file per chapter of a Library book, ready to paste
 * into a TTS ("text → mp3") tool one at a time. Output filenames match the
 * audio convention the reader already expects (see README "듣기 파일
 * 추가하기"): ch1.txt, ch2.txt, ... — so once you have chN.mp3 back from
 * your TTS tool, it goes straight into public/audio/<bookId>/chN.mp3 with
 * no renaming.
 *
 * Usage:
 *   node scripts/extract-chapter-texts.mjs --book <bookId> [--out <dir>]
 *
 * <bookId> matches the "id" field in public/books/index.json (also the
 * filename: public/books/<bookId>.json). Defaults to
 * scratchpad/tts-text/<bookId>/ if --out is omitted — pass --out to write
 * somewhere else (e.g. straight into a temp folder for zipping).
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = { book: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--book') args.book = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

async function main() {
  const { book: bookId, out } = parseArgs(process.argv.slice(2));
  if (!bookId) {
    console.error('Usage: node scripts/extract-chapter-texts.mjs --book <bookId> [--out <dir>]');
    process.exit(1);
  }

  const bookPath = path.join('public', 'books', `${bookId}.json`);
  const book = JSON.parse(await readFile(bookPath, 'utf8'));
  const outDir = out || path.join('scratchpad', 'tts-text', bookId);
  await mkdir(outDir, { recursive: true });

  const manifestLines = [
    `${book.title} — 챕터별 TTS 원문`,
    `총 ${book.chapters.length}개 챕터. 각 chN.txt를 TTS 도구에 붙여넣고,`,
    `나온 결과를 chN.mp3로 저장해서 public/audio/${bookId}/ 폴더에 넣어주세요.`,
    '',
  ];

  await Promise.all(
    book.chapters.map(async (chapter, i) => {
      const n = i + 1;
      const text = chapter.paragraphs.join('\n\n');
      await writeFile(path.join(outDir, `ch${n}.txt`), text, 'utf8');
      manifestLines.push(`[ ] ch${n}.txt — ${chapter.title} (${text.length}자)`);
    })
  );

  await writeFile(path.join(outDir, '_checklist.txt'), manifestLines.join('\n'), 'utf8');

  console.log(`Wrote ${book.chapters.length} chapter text files to ${outDir}/`);
  console.log(`Checklist: ${outDir}/_checklist.txt`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
