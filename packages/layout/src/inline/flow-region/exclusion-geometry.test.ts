import { describe, expect, it } from "vitest";
import {
  subtractQuireInlineExclusionGeometries,
  type QuireInlineExclusionGeometry
} from "./exclusion-geometry";

const zeroClearance = {
  blockStart: 0,
  inlineEnd: 0,
  blockEnd: 0,
  inlineStart: 0
} as const;

describe("inline exclusion geometry", () => {
  it("distinguishes contour envelope from even-odd through intervals", () => {
    const paths = [rectanglePath(40, 0, 40, 40), rectanglePath(120, 0, 40, 40)];
    const common = {
      bounds: { x: 40, y: 0, width: 120, height: 40 },
      clearance: zeroClearance,
      paths,
      side: "both"
    } as const;

    expect(subtractQuireInlineExclusionGeometries(
      { x: 0, y: 10, width: 200, height: 20 },
      [{ ...common, kind: "contour-envelope" }]
    ).intervals).toEqual([
      { from: 0, to: 40 },
      { from: 160, to: 200 }
    ]);
    expect(subtractQuireInlineExclusionGeometries(
      { x: 0, y: 10, width: 200, height: 20 },
      [{ ...common, kind: "contour-through" }]
    ).intervals).toEqual([
      { from: 0, to: 40 },
      { from: 80, to: 120 },
      { from: 160, to: 200 }
    ]);
  });

  it("suppresses the complete row only while a block-band overlaps", () => {
    const exclusion: QuireInlineExclusionGeometry = {
      kind: "block-band",
      bounds: { x: 70, y: 20, width: 60, height: 40 },
      clearance: zeroClearance
    };

    expect(subtractQuireInlineExclusionGeometries(
      { x: 0, y: 25, width: 200, height: 20 },
      [exclusion]
    ).intervals).toEqual([]);
    expect(subtractQuireInlineExclusionGeometries(
      { x: 0, y: 65, width: 200, height: 20 },
      [exclusion]
    ).intervals).toEqual([{ from: 0, to: 200 }]);
  });

  it("applies clearance and largest-side policy before merging cuts", () => {
    const result = subtractQuireInlineExclusionGeometries(
      { x: 0, y: 0, width: 200, height: 20 },
      [{
        kind: "rectangle",
        bounds: { x: 40, y: 0, width: 60, height: 40 },
        clearance: {
          blockStart: 0,
          inlineEnd: 10,
          blockEnd: 0,
          inlineStart: 10
        },
        side: "largest"
      }]
    );

    expect(result).toEqual({
      intervals: [{ from: 110, to: 200 }],
      appliedExclusionIndexes: [0]
    });
  });
});

/**
 * Creates one closed rectangular contour fixture.
 *
 * @param x - Inline origin.
 * @param y - Block origin.
 * @param width - Inline extent.
 * @param height - Block extent.
 * @returns Closed-path source consumed through implicit final-edge closure.
 */
function rectanglePath(
  x: number,
  y: number,
  width: number,
  height: number
): { readonly points: readonly { readonly x: number; readonly y: number }[] } {
  return {
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ]
  };
}
