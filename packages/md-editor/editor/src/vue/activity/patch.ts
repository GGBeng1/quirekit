import { diffLines, splitLines } from "../../activity/lines";

/**
 * Builds a unified diff of two Markdown sources for the shared diff viewer.
 * @param before - Old source.
 * @param after - New source.
 * @param context - Unchanged lines kept around each change.
 * @returns Patch text, empty when the sources are equal.
 */
export function unifiedPatch(before: string, after: string, context = 3): string {
  const a = splitLines(before).map(line => line.replace(/\n$/, "")), b = splitLines(after).map(line => line.replace(/\n$/, ""));
  const hunks = diffLines(splitLines(before), splitLines(after)), out: string[] = [];
  // Changes closer than twice the context share one hunk, as in conventional unified diffs.
  for (let index = 0; index < hunks.length;) {
    let last = index;
    while (last + 1 < hunks.length && hunks[last + 1]!.fromA - hunks[last]!.toA <= 2 * context) last++;
    const first = hunks[index]!, end = hunks[last]!;
    const startA = Math.max(0, first.fromA - context), startB = first.fromB - (first.fromA - startA);
    const endA = Math.min(a.length, end.toA + context), endB = end.toB + (endA - end.toA);
    const rows: string[] = [];
    let i = startA;
    for (const hunk of hunks.slice(index, last + 1)) {
      for (; i < hunk.fromA; i++) rows.push(` ${a[i]}`);
      for (let k = hunk.fromA; k < hunk.toA; k++) rows.push(`-${a[k]}`);
      for (let k = hunk.fromB; k < hunk.toB; k++) rows.push(`+${b[k]}`);
      i = hunk.toA;
    }
    for (; i < endA; i++) rows.push(` ${a[i]}`);
    // A zero-length side names the line before it, per the unified diff convention.
    const range = (start: number, count: number) => `${count ? start + 1 : start},${count}`;
    out.push(`@@ -${range(startA, endA - startA)} +${range(startB, endB - startB)} @@`, ...rows);
    index = last + 1;
  }
  return out.length ? `${out.join("\n")}\n` : "";
}
