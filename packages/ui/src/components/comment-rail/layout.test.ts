import { describe, expect, it } from "vitest";
import {
  layoutQuireCommentRail,
  projectQuireCommentAnchor
} from "./layout";

describe("document-height comment rail", () => {
  it("keeps document-space anchor coordinates stable in the shared scroller", () => {
    const before = projectQuireCommentAnchor({
      anchorClientY: 460,
      railClientY: 120
    });
    const after = projectQuireCommentAnchor({
      anchorClientY: 260,
      railClientY: -80
    });
    expect(before).toBe(340);
    expect(after).toBe(before);
  });

  it("preserves distant anchors and resolves nearby collisions in one pass", () => {
    expect(layoutQuireCommentRail([
      { anchorTop: 120, cardHeight: 90 },
      { anchorTop: 140, cardHeight: 80 },
      { anchorTop: 420, cardHeight: 70 }
    ], 800)).toEqual({
      cardTops: [120, 222, 420],
      stackBottom: 490,
      railHeight: 800,
      hasDocumentOverflow: false
    });
  });

  it("uses document height until the collision-expanded stack exceeds it", () => {
    expect(layoutQuireCommentRail([
      { anchorTop: 220, cardHeight: 160 },
      { anchorTop: 260, cardHeight: 190 },
      { anchorTop: 300, cardHeight: 210 }
    ], 640, 16)).toEqual({
      cardTops: [220, 396, 602],
      stackBottom: 812,
      railHeight: 812,
      hasDocumentOverflow: true
    });
  });

  it("normalizes invalid dimensions without moving cards above the rail", () => {
    expect(layoutQuireCommentRail([
      { anchorTop: Number.NaN, cardHeight: -20 },
      { anchorTop: -100, cardHeight: Number.POSITIVE_INFINITY }
    ], Number.NaN, -8)).toEqual({
      cardTops: [0, 0],
      stackBottom: 0,
      railHeight: 0,
      hasDocumentOverflow: false
    });
  });

  it("lays out a ten-thousand-card rail in one stable forward pass", () => {
    const layout = layoutQuireCommentRail(
      Array.from({ length: 10_000 }, (_, index) => ({
        anchorTop: index * 2,
        cardHeight: 20
      })),
      100_000,
      4
    );

    expect(layout.cardTops).toHaveLength(10_000);
    expect(layout.cardTops[0]).toBe(0);
    expect(layout.cardTops.at(-1)).toBe(239_976);
    expect(layout.stackBottom).toBe(239_996);
    expect(layout.railHeight).toBe(239_996);
    expect(layout.hasDocumentOverflow).toBe(true);
  });
});
