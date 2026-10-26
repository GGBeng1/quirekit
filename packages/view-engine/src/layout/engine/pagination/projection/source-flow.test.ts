import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  clipQuireRectToSourceFlowClip,
  clipQuireRectToSourceFlowRect,
  createQuireFlowRectFromProjectedRect,
  createQuireProjectionSourceFlowClip,
  createQuireProjectionVisualFlowClip,
  hasQuirePageMeasuredSourceFlowBand,
  intersectQuireSourceFlowClips
} from "./source-flow";
import type { QuirePageBodyProjection } from "./types";

describe("canvas layout page projection source-flow helpers", () => {
  it("requires complete measured source-flow page bands", () => {
    expect(hasQuirePageMeasuredSourceFlowBand({
      sourceFlowY: 104,
      sourceFlowHeight: 28
    })).toBe(true);
    expect(hasQuirePageMeasuredSourceFlowBand({
      sourceFlowY: 104
    })).toBe(false);
    expect(hasQuirePageMeasuredSourceFlowBand({
      sourceFlowHeight: 28
    })).toBe(false);
  });

  it("resolves measured source-flow bands", () => {
    const projection = createProjection({
      rect: { x: 40, y: 900, width: 500, height: 60 },
      dy: 800,
      sourceFlowY: 104,
      sourceFlowHeight: 28
    });

    expect(createQuireProjectionSourceFlowClip(projection)).toEqual({
      top: 104,
      bottom: 132
    });
  });

  it("requires measured source-flow bands for source ownership", () => {
    const projection = createProjection({
      rect: { x: 40, y: 900, width: 500, height: 60 },
      dy: 800
    });

    expect(() => createQuireProjectionSourceFlowClip(projection)).toThrow(
      "Page projection requires both sourceFlowY and sourceFlowHeight."
    );
  });

  it("still exposes explicit visual flow coordinates for visual page windows", () => {
    const projection = createProjection({
      rect: { x: 40, y: 900, width: 500, height: 60 },
      dy: 800
    });

    expect(createQuireProjectionVisualFlowClip(projection)).toEqual({
      top: 100,
      bottom: 160
    });
  });

  it("converts projected rectangles back to source flow-space", () => {
    const projection = createProjection({
      rect: { x: 40, y: 900, width: 500, height: 60 },
      dx: 10,
      dy: 20
    });
    const projectedRect = { x: 25, y: 50, width: 40, height: 50 };

    expect(createQuireFlowRectFromProjectedRect(projectedRect, projection)).toEqual({
      x: 15,
      y: 30,
      width: 40,
      height: 50
    });
  });

  it("clips flow-space rectangles by vertical source-flow bands", () => {
    expect(clipQuireRectToSourceFlowClip(
      { x: 10, y: 20, width: 30, height: 40 },
      { top: 35, bottom: 50 }
    )).toEqual({
      x: 10,
      y: 35,
      width: 30,
      height: 15
    });
    expect(clipQuireRectToSourceFlowClip(
      { x: 10, y: 20, width: 30, height: 40 },
      { top: 60, bottom: 70 }
    )).toBeNull();
  });

  it("clips nested flow-space rectangles by parent visible rectangles", () => {
    expect(clipQuireRectToSourceFlowRect(
      { x: 10, y: 20, width: 80, height: 60 },
      { top: 30, bottom: 70 },
      { x: 40, y: 35, width: 20, height: 20 }
    )).toEqual({
      x: 40,
      y: 35,
      width: 20,
      height: 20
    });
    expect(clipQuireRectToSourceFlowRect(
      { x: 10, y: 20, width: 80, height: 60 },
      { top: 30, bottom: 70 },
      { x: 120, y: 35, width: 20, height: 20 }
    )).toBeNull();
  });

  it("intersects source-flow clips for covered row bands", () => {
    expect(intersectQuireSourceFlowClips(
      { top: 20, bottom: 80 },
      { top: 40, bottom: 60 }
    )).toEqual({ top: 40, bottom: 60 });
    expect(intersectQuireSourceFlowClips(
      { top: 20, bottom: 40 },
      { top: 40, bottom: 60 }
    )).toBeNull();
    expect(intersectQuireSourceFlowClips({ top: 20, bottom: 40 }, null)).toBeNull();
  });
});

/**
 * Creates a projection fixture for source-flow helper tests.
 *
 * @param options - Projection geometry and optional measured source-flow band.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Page-local body rectangle. */
  readonly rect: QuireRect;
  /** Horizontal projection offset. */
  readonly dx?: number | undefined;
  /** Vertical projection offset. */
  readonly dy: number;
  /** Optional measured source-flow y coordinate. */
  readonly sourceFlowY?: number | undefined;
  /** Optional measured source-flow height. */
  readonly sourceFlowHeight?: number | undefined;
}): QuirePageBodyProjection {
  return {
    dx: options.dx ?? 0,
    dy: options.dy,
    page: {
      pageIndex: 0,
      range: { from: 1, to: 10 },
      pageRect: { x: 0, y: options.rect.y - 50, width: 600, height: 800 },
      bodyRect: options.rect,
      rect: options.rect,
      sourceFlowY: options.sourceFlowY,
      sourceFlowHeight: options.sourceFlowHeight,
      endInfo: { openMarks: [], openNodes: [] }
    }
  };
}
