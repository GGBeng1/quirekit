/** A changed region between two line lists, as half-open line index ranges. */
export interface LineHunk {
  /** First replaced line of the old list. */
  readonly fromA: number;
  /** End of the replaced lines in the old list. */
  readonly toA: number;
  /** First inserted line of the new list. */
  readonly fromB: number;
  /** End of the inserted lines in the new list. */
  readonly toB: number;
}

// Beyond this edit distance the differing middle becomes one replacement; the trace is bounded by its square.
const maxEdits = 2000;

/**
 * Splits text into lines that keep their terminators, so joining them restores the text exactly.
 * @param text - Source text.
 * @returns Lines; the last one has no terminator when the text does not end with a newline.
 */
export function splitLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/**
 * Computes a minimal line diff with Myers' algorithm after trimming the common prefix and suffix,
 * so a few edits in a long document cost time linear in its length.
 * @param a - Old lines.
 * @param b - New lines.
 * @returns Changed regions in ascending order; adjacent regions never touch.
 */
export function diffLines(a: readonly string[], b: readonly string[]): LineHunk[] {
  let start = 0, endA = a.length, endB = b.length;
  while (start < endA && start < endB && a[start] === b[start]) start++;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  if (start === endA && start === endB) return [];
  const pairs = middlePairs(a, b, start, endA, endB);
  if (!pairs) return [{ fromA: start, toA: endA, fromB: start, toB: endB }];
  // Equal pairs split the middle into changed regions.
  const hunks: LineHunk[] = [];
  let i = start, j = start;
  for (const [x, y] of [...pairs, [endA, endB] as const]) {
    if (x > i || y > j) hunks.push({ fromA: i, toA: x, fromB: j, toB: y });
    i = x + 1; j = y + 1;
  }
  return hunks;
}

/**
 * Myers' greedy forward search over the differing middle, keeping each round's frontier for the backtrack.
 * @param a - Old lines. @param b - New lines. @param start - First differing index in both.
 * @param endA - End of the old middle. @param endB - End of the new middle.
 * @returns Equal line pairs in ascending order, or null when the edit distance exceeds the bound.
 */
function middlePairs(a: readonly string[], b: readonly string[], start: number, endA: number, endB: number): (readonly [number, number])[] | null {
  const n = endA - start, m = endB - start, offset = Math.min(n + m, maxEdits) + 1;
  const frontier = new Int32Array(2 * offset + 1), trace: Int32Array[] = [];
  for (let d = 0; d <= Math.min(n + m, maxEdits); d++) {
    trace.push(frontier.slice(offset - d, offset + d + 1));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && frontier[offset + k - 1]! < frontier[offset + k + 1]!) ? frontier[offset + k + 1]! : frontier[offset + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[start + x] === b[start + y]) { x++; y++; }
      frontier[offset + k] = x;
      if (x >= n && y >= m) return backtrack(trace, a, b, start, n, m, d);
    }
  }
  return null;
}

/**
 * @param trace - Frontier before each round, indexed from diagonal `-d`. @param a - Old lines. @param b - New lines.
 * @param start - Middle offset. @param n - Old middle length. @param m - New middle length. @param last - Final round.
 * @returns Equal pairs of the shortest edit script, in absolute indices.
 */
function backtrack(trace: readonly Int32Array[], a: readonly string[], b: readonly string[], start: number, n: number, m: number, last: number): (readonly [number, number])[] {
  const pairs: (readonly [number, number])[] = [];
  let x = n, y = m;
  for (let d = last; d > 0; d--) {
    const before = trace[d]!, at = (k: number) => before[k + d]!, k = x - y;
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const previousK = down ? k + 1 : k - 1, previousX = at(previousK), previousY = previousX - previousK;
    while (x > previousX + (down ? 0 : 1) && y > previousY + (down ? 1 : 0)) { x--; y--; pairs.push([start + x, start + y]); }
    x = previousX; y = previousY;
  }
  while (x > 0 && y > 0) { x--; y--; pairs.push([start + x, start + y]); }
  return pairs.reverse();
}
