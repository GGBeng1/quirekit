import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireLayoutNode } from "../../layout";
import {
  resolveQuireDecorationWidgetLineRect,
  resolveQuireDecorationWidgetRect
} from "./widget";

describe("widget decoration geometry", () => {
  it("resolves a visual line across sibling inline layout subtrees", () => {
    const root: QuireLayoutNode = {
      id: "root",
      kind: "block",
      range: { from: 0, to: 4 },
      rect: { x: 0, y: 0, width: 200, height: 40 },
      children: [{
        id: "paragraph",
        kind: "block",
        range: { from: 0, to: 4 },
        rect: { x: 10, y: 10, width: 180, height: 24 },
        children: [{
          id: "before-anchor",
          kind: "inline",
          range: { from: 1, to: 2 },
          rect: { x: 10, y: 10, width: 10, height: 24 },
          textFragments: [fragment("before", "a", 1, 2, 10, 10)]
        }, {
          id: "after-anchor",
          kind: "inline",
          range: { from: 2, to: 4 },
          rect: { x: 20, y: 10, width: 20, height: 24 },
          textFragments: [fragment("after", "bc", 2, 4, 20, 20)]
        }]
      }]
    };
    const snapshot = { root } as unknown as QuireLayoutSnapshot;

    expect(resolveQuireDecorationWidgetRect(snapshot, 2)).toEqual({
      x: 20,
      y: 10,
      width: 1,
      height: 24
    });
    expect(resolveQuireDecorationWidgetLineRect(snapshot, 2)).toEqual({
      x: 10,
      y: 10,
      width: 30,
      height: 24
    });
  });
});

/**
 * Creates one measured fragment for the split-inline geometry fixture.
 *
 * @param id - Stable fragment id.
 * @param text - Visible fragment text.
 * @param from - Inclusive document position.
 * @param to - Exclusive document position.
 * @param x - Fragment x coordinate.
 * @param width - Fragment width.
 * @returns Complete measured text fragment.
 */
function fragment(
  id: string,
  text: string,
  from: number,
  to: number,
  x: number,
  width: number
): QuireTextFragment {
  return {
    id,
    text,
    range: { from, to },
    rect: { x, y: 10, width, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 28,
    caretStops: [
      { position: { pos: from }, localX: 0 },
      { position: { pos: to }, localX: width }
    ]
  };
}
