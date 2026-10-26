import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutNode } from "../../types";
import { describe, expect, it } from "vitest";
import { resolveQuireTextCaretAnchorForPath } from "./anchor";

/**
 * Creates measured text with explicit source endpoints and optional geometry.
 * @param from - First document caret position.
 * @param to - Last document caret position.
 * @param overrides - Metrics needed by a focused geometry regression.
 * @returns Neutral editable text fragment.
 */
function fragment(from: number, to: number, overrides: Partial<QuireTextFragment> = {}): QuireTextFragment {
  return {
    id: `text-${from}-${to}`, text: "x".repeat(to - from), range: { from, to },
    rect: { x: 10, y: 20, width: (to - from) * 10, height: 24 },
    font: "16px sans-serif", lineHeight: 24, baseline: 38,
    caretStops: [{ position: { pos: from, bias: 1 }, localX: 0 },
      ...(from === to ? [] : [{ position: { pos: to, bias: -1 as const }, localX: (to - from) * 10 }])],
    ...overrides
  };
}

/**
 * Creates the already-located owner for a local caret query.
 * @param fragments - Owner's measured editable and generated fragments.
 * @param to - Owner's closing structural position.
 * @returns Neutral retained layout owner.
 */
function owner(fragments: readonly QuireTextFragment[], to = 12): QuireLayoutNode {
  return { id: "owner", kind: "block", range: { from: 0, to },
    rect: { x: 0, y: 0, width: 500, height: 100 }, textFragments: fragments };
}

/**
 * Queries caret geometry from one exact retained occurrence.
 * @param node - Owner already selected by document position and visual context.
 * @param position - Requested PM position.
 * @param side - Existing side preference for an ambiguous gap.
 * @returns Current owner caret anchor.
 */
function caret(node: QuireLayoutNode, position: number, side = 1) {
  return resolveQuireTextCaretAnchorForPath({ nodes: [node], nodePath: [node], position, side });
}

describe("text caret positions omitted by zero-paint inline sources", () => {
  it.each([1, 2, 3])("uses the first measured stop for leading position %s and preserves its identity", position => {
    expect(caret(owner([fragment(4, 8)]), position)).toMatchObject({
      position: { pos: position, bias: 0 }, rect: { x: 10, y: 20, width: 1, height: 24 }, source: "text"
    });
  });

  it.each([6, 7, 8])("uses the last measured stop for trailing position %s", position => {
    expect(caret(owner([fragment(1, 5)]), position)).toMatchObject({
      position: { pos: position, bias: 0 }, rect: { x: 50, y: 20 }, source: "text"
    });
  });

  it.each([1, 2, 3])("uses the empty editable fragment for marker-only position %s", position => {
    expect(caret(owner([fragment(1, 1)], 4), position)).toMatchObject({
      position: { pos: position, bias: 0 }, rect: { x: 10, y: 20, height: 24 }, source: "text"
    });
  });

  it.each([1, -1])("keeps side=%s affinity for an uncovered gap between visual lines", side => {
    const node = owner([fragment(1, 3), fragment(6, 8, { rect: { x: 10, y: 44, width: 20, height: 24 }, baseline: 62 })]);
    expect(caret(node, 4, side)).toMatchObject({ position: { pos: 4, bias: 0 },
      rect: side < 0 ? { x: 30, y: 20 } : { x: 10, y: 44 } });
  });

  it("uses logical endpoint stops from a reversed visual run", () => {
    const node = owner([fragment(3, 6, {
      direction: "rtl",
      caretStops: [{ position: { pos: 6, bias: -1 }, localX: 0 }, { position: { pos: 3, bias: 1 }, localX: 30 }]
    })]);
    expect(caret(node, 1)).toMatchObject({ position: { pos: 1 }, rect: { x: 40 } });
    expect(caret(node, 7)).toMatchObject({ position: { pos: 7 }, rect: { x: 10 } });
  });

  it("ignores generated fragments without editable stops", () => {
    const node = owner([fragment(1, 1, { text: "bullet", caretStops: [], rect: { x: 200, y: 20, width: 30, height: 24 } }), fragment(4, 8)]);
    expect(caret(node, 1)).toMatchObject({ position: { pos: 1 }, rect: { x: 10 } });
  });

  it("keeps direct wrapped boundary candidates ahead of the gap fallback", () => {
    const node = owner([fragment(1, 4), fragment(4, 7, { rect: { x: 10, y: 44, width: 30, height: 24 }, baseline: 62 })]);
    expect(caret(node, 4, 1)).toMatchObject({ position: { pos: 4 }, rect: { x: 10, y: 44 } });
    expect(caret(node, 4, -1)).toMatchObject({ position: { pos: 4 }, rect: { x: 40, y: 20 } });
  });

  it("keeps structural owner boundaries in the existing structural path", () => {
    const node = owner([fragment(2, 6)], 8);
    expect(caret(node, 0)).toMatchObject({ position: { pos: 2 }, source: "structural" });
    expect(caret(node, 8)).toMatchObject({ position: { pos: 6 }, source: "structural" });
  });

  it("uses clipped run metrics when a local gap resolves to an off-clip stop", () => {
    const node = owner([fragment(3, 6, {
      rect: { x: 10, y: 20, width: 40, height: 34 }, baseline: 46, runAscent: 12, runDescent: 4,
      caretStops: [{ position: { pos: 3 }, localX: 0 }, { position: { pos: 4 }, localX: 10 },
        { position: { pos: 5 }, localX: 20 }, { position: { pos: 6 }, localX: 40 }]
    })], 8);
    const clip: QuireLayoutNode = { id: "clip", kind: "block", range: node.range,
      rect: { x: 20, y: 35, width: 20, height: 8 }, children: [node] };
    expect(resolveQuireTextCaretAnchorForPath({ nodes: [clip], nodePath: [clip, node], position: 1 }))
      .toMatchObject({ position: { pos: 1 }, rect: { x: 20, y: 35, width: 1, height: 8 } });
  });

  it("resolves the local gap without reading unrelated owner fragments", () => {
    const node = owner([fragment(4, 8)]);
    const unrelated: QuireLayoutNode = { ...owner([], 30), id: "unrelated", range: { from: 20, to: 30 },
      get textFragments(): readonly QuireTextFragment[] { throw new Error("Unrelated owner was scanned."); } };
    expect(resolveQuireTextCaretAnchorForPath({ nodes: [node, unrelated], nodePath: [node], position: 1 }))
      .toMatchObject({ position: { pos: 1 }, rect: { x: 10 } });
  });
});
