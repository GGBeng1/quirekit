import { describe, expect, it } from "vitest";
import type { QuireTableCellFragment } from "../../../../table";
import {
  createQuireTableCellContentSourceClip,
  summarizeQuireTableCellSourceFlowSlice,
  summarizeQuireTableCellPageSlice,
  resolveQuireTableCellContentLayoutRect
} from ".";
import type { QuirePageBodyProjection } from "../../types";

describe("table cell content geometry", () => {
  it("converts a page-local cell content rectangle into source-flow clip geometry", () => {
    const cell = createCell({
      contentRect: { x: 130, y: 260, width: 120, height: 40 }
    });
    const projection = createProjection({ dx: 30, dy: 200 });

    expect(createQuireTableCellContentSourceClip(cell, projection)).toEqual({
      flowClip: { top: 60, bottom: 100 },
      rectClip: { x: 100, y: 60, width: 120, height: 40 }
    });
  });

  it("uses a projected cell's own source-flow height when available", () => {
    const cell = createCell({
      contentRect: { x: 130, y: 260, width: 120, height: 40 },
      cellSourceFlowY: 24,
      cellSourceFlowHeight: 32
    });
    const projection = createProjection({ dx: 30, dy: 200 });

    expect(createQuireTableCellContentSourceClip(cell, projection)).toEqual({
      flowClip: { top: 60, bottom: 92 },
      rectClip: { x: 100, y: 60, width: 120, height: 32 }
    });
  });

  it("summarizes a source-flow cell slice before page translation", () => {
    const cell = createCell({
      rect: { x: 90, y: 50, width: 140, height: 60 },
      contentRect: { x: 100, y: 60, width: 120, height: 40 },
      contentLayoutRect: { x: 102, y: 64, width: 116, height: 32 }
    });

    expect(summarizeQuireTableCellSourceFlowSlice(cell)).toEqual({
      cellId: "cell-a#p1",
      semanticCellId: "semantic-a",
      originExplicitCellId: "cell-a",
      explicitCellIds: ["cell-a"],
      originCellPos: 1,
      gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
      range: { from: 1, to: 10 },
      sourceVisualRect: { x: 90, y: 50, width: 140, height: 60 },
      sourceContentRect: { x: 100, y: 60, width: 120, height: 40 },
      sourceContentLayoutRect: { x: 102, y: 64, width: 116, height: 32 },
      visualFlowClip: { top: 50, bottom: 110 },
      contentFlowClip: { top: 60, bottom: 100 }
    });
  });

  it("summarizes the page-local cell slice before deriving content-only geometry", () => {
    const cell = createCell({
      rect: { x: 120, y: 250, width: 140, height: 60 },
      contentRect: { x: 130, y: 260, width: 120, height: 40 },
      cellSourceFlowHeight: 32
    });
    const projection = createProjection({ dx: 30, dy: 200 });

    expect(summarizeQuireTableCellPageSlice(cell, projection)).toEqual({
      cellId: "cell-a#p1",
      semanticCellId: "semantic-a",
      originExplicitCellId: "cell-a",
      explicitCellIds: ["cell-a"],
      originCellPos: 1,
      gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
      range: { from: 1, to: 10 },
      visualClip: { x: 120, y: 250, width: 140, height: 60 },
      contentClip: { x: 130, y: 260, width: 120, height: 40 },
      sourceVisualRect: { x: 90, y: 50, width: 140, height: 60 },
      sourceContentRect: { x: 100, y: 60, width: 120, height: 32 },
      contentSourceFlowY: 60,
      contentSourceFlowHeight: 32
    });
  });

  it("uses explicit content layout geometry before falling back to the content clip", () => {
    const contentRect = { x: 20, y: 30, width: 100, height: 40 };
    const contentLayoutRect = { x: 22, y: 34, width: 96, height: 32 };

    expect(resolveQuireTableCellContentLayoutRect(createCell({ contentRect }))).toBe(
      contentRect
    );
    expect(
      resolveQuireTableCellContentLayoutRect(
        createCell({ contentRect, contentLayoutRect })
      )
    ).toBe(contentLayoutRect);
  });
});

/**
 * Creates a projected table-cell fixture.
 *
 * @param options - Cell content rectangles.
 * @returns Table cell fragment fixture.
 */
function createCell(options: {
  /** Page-local full cell rectangle. */
  readonly rect?: QuireTableCellFragment["rect"] | undefined;
  /** Page-local content clipping rectangle. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
  /** Optional cell-local content flow top accepted by this fragment. */
  readonly cellSourceFlowY?: QuireTableCellFragment["cellSourceFlowY"];
  /** Optional cell-local content flow height accepted by this fragment. */
  readonly cellSourceFlowHeight?: QuireTableCellFragment["cellSourceFlowHeight"];
  /** Optional page-local content layout rectangle. */
  readonly contentLayoutRect?: QuireTableCellFragment["contentLayoutRect"];
}): QuireTableCellFragment {
  return {
    id: "cell-a#p1",
    semanticCellId: "semantic-a",
    originExplicitCellId: "cell-a",
    explicitCellIds: ["cell-a"],
    originCellPos: 1,
    range: { from: 1, to: 10 },
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
    rect: options.rect ?? { x: 10, y: 20, width: 140, height: 70 },
    contentRect: options.contentRect,
    ...(options.cellSourceFlowY === undefined
      ? {}
      : { cellSourceFlowY: options.cellSourceFlowY }),
    ...(options.cellSourceFlowHeight === undefined
      ? {}
      : { cellSourceFlowHeight: options.cellSourceFlowHeight }),
    ...(options.contentLayoutRect === undefined
      ? {}
      : { contentLayoutRect: options.contentLayoutRect }),
    contentChildren: []
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Projection offsets.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Horizontal projection offset. */
  readonly dx: number;
  /** Vertical projection offset. */
  readonly dy: number;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: 1,
      range: { from: 1, to: 10 },
      pageRect: { x: 0, y: 200, width: 400, height: 300 },
      bodyRect: { x: 30, y: 200, width: 300, height: 200 },
      rect: { x: 30, y: 200, width: 300, height: 200 },
      sourceFlowY: 0,
      sourceFlowHeight: 200,
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: options.dx,
    dy: options.dy
  };
}
