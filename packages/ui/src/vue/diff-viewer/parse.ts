import type { DiffHunk, DiffParseResult, DiffRow, DiffSegment } from './types';

const hunkHeader = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$/;

/**
 * Parses bounded unified-diff text without applying the patch or inventing missing lines.
 * @param patch - Original patch text.
 * @param maxCharacters - Maximum source length admitted to structured reading.
 * @returns Verified segments or a reason to retain the raw source view.
 */
export function parseDiffForViewer(patch: string, maxCharacters: number): DiffParseResult {
  if (patch.length > maxCharacters) return { kind: 'large' };
  if (!patch) return { kind: 'invalid' };
  const lines = patch.replace(/\r\n?/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  const segments: DiffSegment[] = [];
  let metadata: string[] = [];
  let additions = 0;
  let removals = 0;
  let cursor = 0;

  // Metadata stays in source order. A hunk is emitted only after its declared
  // old/new line counts are satisfied, so displayed line numbers remain true.
  while (cursor < lines.length) {
    const header = lines[cursor]!;
    const match = hunkHeader.exec(header);
    if (!match) {
      if (/^@@/.test(header) || (/^[ +\\-]/.test(header) && !/^(--- |\+\+\+ )/.test(header))) return { kind: 'invalid' };
      metadata.push(header);
      cursor++;
      continue;
    }
    if (metadata.length) {
      segments.push({ kind: 'metadata', lines: metadata });
      metadata = [];
    }
    const oldStart = Number(match[1]);
    const oldCount = match[2] === undefined ? 1 : Number(match[2]);
    const newStart = Number(match[3]);
    const newCount = match[4] === undefined ? 1 : Number(match[4]);
    if (![oldStart, oldCount, newStart, newCount].every(Number.isSafeInteger)) return { kind: 'invalid' };
    let oldNumber = oldStart;
    let newNumber = newStart;
    let hunkAdditions = 0;
    let hunkRemovals = 0;
    const rows: DiffRow[] = [];
    cursor++;
    while (cursor < lines.length && (oldNumber - oldStart < oldCount || newNumber - newStart < newCount)) {
      const line = lines[cursor]!;
      const prefix = line[0];
      if (prefix === ' ') {
        rows.push({ kind: 'context', oldNumber: oldNumber++, newNumber: newNumber++, text: line.slice(1) });
      } else if (prefix === '+') {
        rows.push({ kind: 'added', oldNumber: null, newNumber: newNumber++, text: line.slice(1) });
        hunkAdditions++;
      } else if (prefix === '-') {
        rows.push({ kind: 'removed', oldNumber: oldNumber++, newNumber: null, text: line.slice(1) });
        hunkRemovals++;
      } else if (line.startsWith('\\ No newline at end of file')) {
        rows.push({ kind: 'note', oldNumber: null, newNumber: null, text: line });
      } else {
        return { kind: 'invalid' };
      }
      if (oldNumber - oldStart > oldCount || newNumber - newStart > newCount) return { kind: 'invalid' };
      cursor++;
    }
    if (oldNumber - oldStart !== oldCount || newNumber - newStart !== newCount) return { kind: 'invalid' };
    while (lines[cursor]?.startsWith('\\ No newline at end of file')) {
      rows.push({ kind: 'note', oldNumber: null, newNumber: null, text: lines[cursor]! });
      cursor++;
    }
    const hunk: DiffHunk = { header, index: segments.length, rows, additions: hunkAdditions, removals: hunkRemovals };
    segments.push({ kind: 'hunk', hunk });
    additions += hunkAdditions;
    removals += hunkRemovals;
  }
  if (metadata.length) segments.push({ kind: 'metadata', lines: metadata });
  return segments.some(segment => segment.kind === 'hunk')
    ? { kind: 'diff', segments, additions, removals }
    : { kind: 'invalid' };
}
