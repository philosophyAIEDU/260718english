/*
 * Export helpers — turn the vocab book into files that Anki and Quizlet
 * can import. Everything is generated in the browser and downloaded via a
 * Blob URL; no data leaves the device.
 */

/**
 * Anki-compatible CSV.
 * Two quoted columns: Front, Back. Import in Anki with
 * "Fields separated by: Comma" and "Allow HTML in fields" enabled
 * (the back uses <br> line breaks).
 */
export function toAnkiCsv(entries) {
  const rows = entries.map((v) => {
    const front = v.partOfSpeech ? `${v.word} (${v.partOfSpeech})` : v.word;
    const backParts = [
      v.collinsDefinition,
      v.longmanSynonyms?.length ? `Synonyms: ${v.longmanSynonyms.join(', ')}` : '',
      v.exampleFromPage ? `Example: ${v.exampleFromPage}` : '',
      v.collocations?.length ? `Collocations: ${v.collocations.join('; ')}` : '',
      v.register ? `Register: ${v.register}` : '',
    ].filter(Boolean);
    return `${csvQuote(front)},${csvQuote(backParts.join('<br>'))}`;
  });
  return rows.join('\n');
}

/**
 * Quizlet-compatible plain text.
 * Quizlet's importer accepts "term<TAB>definition" with one card per line.
 */
export function toQuizletText(entries) {
  return entries
    .map((v) => {
      const term = v.partOfSpeech ? `${v.word} (${v.partOfSpeech})` : v.word;
      const definition = [
        v.collinsDefinition,
        v.longmanSynonyms?.length ? `= ${v.longmanSynonyms.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        // Tabs and newlines would break the one-card-per-line format.
        .replace(/[\t\n\r]+/g, ' ');
      return `${term}\t${definition}`;
    })
    .join('\n');
}

function csvQuote(value) {
  return `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, '<br>')}"`;
}

/** Trigger a client-side download of `content` as `filename`. */
export function downloadTextFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
