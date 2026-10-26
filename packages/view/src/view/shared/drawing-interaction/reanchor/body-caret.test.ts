import type { QuireLayoutNode, QuireLayoutPage } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { findNearestBodyCaretPoint } from "./body-caret";

describe("drawing reanchor body caret lookup", () => {
  it("filters out a closer header candidate before comparing distance", () => {
    const page: QuireLayoutPage = {
      pageIndex: 1,
      range: { from: 10, to: 30 },
      pageRect: { x: 0, y: 100, width: 320, height: 120 },
      bodyRect: { x: 24, y: 140, width: 272, height: 56 }
    };
    const root = {
      id: "root",
      kind: "block",
      range: { from: 0, to: 40 },
      rect: { x: 0, y: 0, width: 320, height: 220 },
      children: [
        {
          id: "header-text",
          kind: "inline",
          range: { from: 10, to: 12 },
          rect: { x: 24, y: 136, width: 120, height: 16 },
          viewRegion: { kind: "header" },
          textFragments: [{}]
        },
        {
          id: "body-text",
          kind: "inline",
          range: { from: 12, to: 20 },
          rect: { x: 24, y: 156, width: 160, height: 18 },
          viewRegion: { kind: "body" },
          textFragments: [{}]
        }
      ]
    } as unknown as QuireLayoutNode;

    expect(findNearestBodyCaretPoint(root, { x: 80, y: 140 }, page)).toEqual({
      x: 80,
      y: 156.5
    });
  });
});
