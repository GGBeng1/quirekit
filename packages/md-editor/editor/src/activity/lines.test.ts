import { describe, expect, it } from "vitest";
import { diffLines, splitLines } from "./lines";

/** @param a - Old lines. @param b - New lines. @returns Old lines with every hunk replaced, plus the count of kept lines. */
function apply(a: readonly string[], b: readonly string[]) {
  const hunks = diffLines(a, b), out: string[] = [];
  let i = 0, kept = 0;
  for (const hunk of hunks) { out.push(...a.slice(i, hunk.fromA)); kept += hunk.fromA - i; out.push(...b.slice(hunk.fromB, hunk.toB)); i = hunk.toA; }
  out.push(...a.slice(i)); kept += a.length - i;
  return { out, kept, hunks };
}

describe("line diff", () => {
  it("splits lines without losing terminators", () => {
    expect(splitLines("a\nb")).toEqual(["a\n", "b"]);
    expect(splitLines("a\n\n")).toEqual(["a\n", "\n"]);
    expect(splitLines("")).toEqual([]);
  });

  it("reconstructs the new text and keeps every common line", () => {
    const random = (seed: number) => () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const next = random(7);
    for (let round = 0; round < 200; round++) {
      const a = Array.from({ length: Math.floor(next() * 30) }, () => "abcd"[Math.floor(next() * 4)]!);
      const b = Array.from({ length: Math.floor(next() * 30) }, () => "abcd"[Math.floor(next() * 4)]!);
      const { out, kept } = apply(a, b);
      expect(out).toEqual(b);
      // Longest common subsequence length, the minimum a correct diff must keep.
      const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
      for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
      expect(kept).toBe(table[0]![0]);
    }
  });

  it("touches only edited lines of a long document and falls back past the edit bound", () => {
    const a = Array.from({ length: 20_000 }, (_, index) => `line ${index}\n`), b = [...a];
    b[10] = "changed\n"; b.splice(15_000, 1);
    expect(diffLines(a, b)).toEqual([{ fromA: 10, toA: 11, fromB: 10, toB: 11 }, { fromA: 15_000, toA: 15_001, fromB: 15_000, toB: 15_000 }]);
    const c = a.map(line => `x${line}`);
    expect(apply(a, c).hunks).toEqual([{ fromA: 0, toA: 20_000, fromB: 0, toB: 20_000 }]);
  });
});
