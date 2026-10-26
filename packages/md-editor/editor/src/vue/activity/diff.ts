/** One run of an inline diff. */
export interface InlineDiffPart {
  /** Unchanged, deleted or inserted text. */
  readonly type: "same" | "delete" | "insert";
  /** Literal text of the run. */
  readonly text: string;
}

// Character comparison beyond this many cells falls back to one deletion plus one insertion.
const maxCells = 250_000;

/**
 * Computes a character-level inline diff of two short fragments. Common prefix and suffix are trimmed first,
 * so a single edit costs time linear in the fragment length; only the differing middle is compared cell by cell.
 * Comparison runs on code points, never splitting surrogate pairs.
 * @param before - Fragment before the change.
 * @param after - Fragment after the change.
 * @returns Runs in reading order; adjacent runs never share a type.
 */
export function inlineDiff(before: string, after: string): readonly InlineDiffPart[] {
  const a = Array.from(before), b = Array.from(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const parts: InlineDiffPart[] = [];
  /** @param type - Run type. @param text - Run text, merged into the previous run of the same type. */
  const push = (type: InlineDiffPart["type"], text: string): void => {
    if (!text) return;
    const last = parts.at(-1);
    if (last?.type === type) parts[parts.length - 1] = { type, text: last.text + text }; else parts.push({ type, text });
  };
  push("same", a.slice(0, start).join(""));
  const middleA = a.slice(start, endA), middleB = b.slice(start, endB);
  if (middleA.length * middleB.length > maxCells) { push("delete", middleA.join("")); push("insert", middleB.join("")); }
  else for (const part of middleDiff(middleA, middleB)) push(part.type, part.text);
  push("same", a.slice(endA).join(""));
  return parts;
}

/** @param a - Differing middle before. @param b - Differing middle after. @returns Runs from a longest-common-subsequence walk. */
function middleDiff(a: readonly string[], b: readonly string[]): InlineDiffPart[] {
  const columns = b.length + 1, table = new Uint32Array((a.length + 1) * columns);
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
    table[i * columns + j] = a[i] === b[j] ? table[(i + 1) * columns + j + 1]! + 1 : Math.max(table[(i + 1) * columns + j]!, table[i * columns + j + 1]!);
  }
  const parts: InlineDiffPart[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { parts.push({ type: "same", text: a[i]! }); i++; j++; }
    // Deletions come before insertions at a tie, so a replacement reads as "old, then new".
    else if (i < a.length && (j === b.length || table[(i + 1) * columns + j]! >= table[i * columns + j + 1]!)) { parts.push({ type: "delete", text: a[i]! }); i++; }
    else { parts.push({ type: "insert", text: b[j]! }); j++; }
  }
  return parts;
}
