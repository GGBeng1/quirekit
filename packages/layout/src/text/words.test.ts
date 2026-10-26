import { describe, expect, it } from "vitest";
import {
  findNextQuireWordBoundary,
  findPreviousQuireWordBoundary,
  resolveQuireWordRangeAt
} from "./words";

describe("canvas word segmentation", () => {
  it("selects a single Latin word and not the whitespace around it", () => {
    expect(resolveQuireWordRangeAt("ab cd", 0)).toEqual({ from: 0, to: 2 });
    expect(resolveQuireWordRangeAt("ab cd", 4)).toEqual({ from: 3, to: 5 });
    expect(resolveQuireWordRangeAt("ab cd", 2)).toBeNull();
  });

  it("keeps a contraction whole", () => {
    expect(resolveQuireWordRangeAt("don't", 0)).toEqual({ from: 0, to: 5 });
  });

  it("selects one CJK word, not the whole run", () => {
    // With Intl.Segmenter, "你好世界" splits into words; double-click selects one,
    // not all four characters. The exact split is locale-dependent, but it must
    // be a strict sub-range of the run.
    const range = resolveQuireWordRangeAt("你好世界", 0);

    expect(range).not.toBeNull();
    expect(range!.from).toBe(0);
    expect(range!.to).toBeGreaterThan(0);
    expect(range!.to).toBeLessThan(4);
  });

  it("moves by word boundaries like the Latin baseline", () => {
    expect(findNextQuireWordBoundary("ab cd", 0)).toBe(2);
    expect(findNextQuireWordBoundary("ab cd", 2)).toBe(5);
    expect(findPreviousQuireWordBoundary("ab cd", 5)).toBe(3);
    expect(findPreviousQuireWordBoundary("ab cd", 3)).toBe(0);
  });

  it("stops between CJK words instead of jumping the whole run", () => {
    const next = findNextQuireWordBoundary("你好世界", 0);

    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(4);
  });
});
