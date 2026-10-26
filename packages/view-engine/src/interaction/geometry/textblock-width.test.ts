import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireLayoutNode } from "../../layout";
import { resolveQuireTextblockContentWidth } from "./textblock-width";

/** @param textWidth - Empty paragraph's wrapping width. @param contentWidth - Optional resolved inline interval. @returns Neutral nested cell geometry, independent of Word node names. */
function snapshot(textWidth: number, contentWidth?: number): QuireLayoutSnapshot {
  const paragraph: QuireLayoutNode = { id: "empty-text", kind: "block", range: { from: 4, to: 4 },
    rect: { x: 30, y: 40, width: textWidth, height: 20 }, inlineContentWidth: contentWidth, textRuns: [], textFragments: [] };
  return { root: { id: "root", kind: "block", range: { from: 0, to: 10 }, rect: { x: 0, y: 0, width: 500, height: 600 },
    children: [{ id: "cell", kind: "block", range: { from: 2, to: 6 }, rect: { x: 20, y: 30, width: 180, height: 80 }, children: [paragraph] }] } } as unknown as QuireLayoutSnapshot;
}

describe("neutral insertion width", () => {
  it("reads the unscaled empty paragraph width rather than its enclosing page", () => {
    expect(resolveQuireTextblockContentWidth(snapshot(160), 4)).toBe(160);
    expect(resolveQuireTextblockContentWidth(snapshot(160), 7)).toBeNull();
    expect(resolveQuireTextblockContentWidth(snapshot(160), 100)).toBeNull();
  });
  it("respects the containing cell when a realized child extends beyond it", () => {
    expect(resolveQuireTextblockContentWidth(snapshot(200), 4)).toBe(180);
    expect(resolveQuireTextblockContentWidth(snapshot(NaN), 4)).toBeNull();
  });
  it("consumes resolved indentation width even when an empty paragraph occupies no glyphs", () => {
    expect(resolveQuireTextblockContentWidth(snapshot(180, 84), 4)).toBe(84);
    expect(resolveQuireTextblockContentWidth(snapshot(180, NaN), 4)).toBeNull();
  });
});
