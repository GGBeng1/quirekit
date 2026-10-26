import { describe, expect, it } from "vitest";
import { paginateQuireLayoutDocument } from "../..";
import type {
  QuireLayoutBox,
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../../../types";
import { projectQuireLayoutDocumentToPages } from "../../projection";
import {
  createEmptyAnchorRegionProducts,
  createLayoutDocument,
  createLineFragments,
  createPageGeometry
} from "../../../../../../test-support/layout/pagination";

describe("canvas layout page projection paragraph flow continuation", () => {
  it("skips pages whose first complete block follows an already-open fragment", () => {
    const document = createLayoutDocument([
      { id: "paragraph-0", from: 0, to: 4, y: 0, height: 40 },
      { id: "paragraph-1", from: 4, to: 6, y: 48, height: 20 }
    ]);

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 1,
          range: { from: 2, to: 6 },
          pageRect: { x: 0, y: 100, width: 300, height: 100 },
          bodyRect: { x: 20, y: 120, width: 260, height: 60 },
          rect: { x: 20, y: 120, width: 260, height: 60 },
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children[1]?.rect).toEqual({
      x: 0,
      y: 48,
      width: 500,
      height: 20
    });
  });

  it("splits a straddling box into per-page boxes with page-local geometry", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 13,
        y: 0,
        height: 96,
        textFragments: createLineFragments({ lineCount: 4, y: 0 })
      }
    ]);

    const projected = paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(48)
    });

    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        textFragments: box.textFragments?.map((fragment) => ({
          rect: fragment.rect,
          baseline: fragment.baseline
        }))
      }))
    ).toEqual([
      {
        id: "paragraph-0#p0",
        range: { from: 1, to: 7 },
        rect: { x: 40, y: 50, width: 120, height: 48 },
        textFragments: [
          { rect: { x: 40, y: 50, width: 120, height: 24 }, baseline: 68 },
          { rect: { x: 40, y: 74, width: 120, height: 24 }, baseline: 92 }
        ]
      },
      {
        id: "paragraph-0#p1",
        range: { from: 7, to: 13 },
        rect: { x: 40, y: 850, width: 120, height: 48 },
        textFragments: [
          { rect: { x: 40, y: 850, width: 120, height: 24 }, baseline: 868 },
          { rect: { x: 40, y: 874, width: 120, height: 24 }, baseline: 892 }
        ]
      }
    ]);
  });

  it("places boundary text fragments by page flow clip before range fallback", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 13,
        y: 0,
        height: 96,
        textFragments: createLineFragments({ lineCount: 4, y: 0 })
      }
    ]);

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [
          {
            pageIndex: 0,
            range: { from: 1, to: 10 },
            pageRect: { x: 0, y: 0, width: 600, height: 800 },
            bodyRect: { x: 40, y: 50, width: 500, height: 48 },
            rect: { x: 40, y: 50, width: 500, height: 48 },
            sourceFlowY: 0,
            sourceFlowHeight: 48,
            endInfo: { openMarks: [], openNodes: [] }
          },
          {
            pageIndex: 1,
            range: { from: 7, to: 13 },
            pageRect: { x: 0, y: 800, width: 600, height: 800 },
            bodyRect: { x: 40, y: 850, width: 500, height: 48 },
            rect: { x: 40, y: 850, width: 500, height: 48 },
            sourceFlowY: 48,
            sourceFlowHeight: 48,
            endInfo: { openMarks: [], openNodes: [] }
          }
        ]
      }
    });

    expect(
      projected.children.map((box) => ({
        id: box.id,
        range: box.range,
        rect: box.rect,
        text: box.textFragments?.map((fragment) => fragment.text),
        y: box.textFragments?.map((fragment) => fragment.rect.y)
      }))
    ).toEqual([
      {
        id: "paragraph-0#p0",
        range: { from: 1, to: 7 },
        rect: { x: 40, y: 50, width: 120, height: 48 },
        text: ["L0", "L1"],
        y: [50, 74]
      },
      {
        id: "paragraph-0#p1",
        range: { from: 7, to: 13 },
        rect: { x: 40, y: 850, width: 120, height: 48 },
        text: ["L2", "L3"],
        y: [850, 874]
      }
    ]);
  });

  it("uses measured source-flow height instead of page-local rect height for text ownership", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 10,
        y: 0,
        height: 72,
        textFragments: createLineFragments({ lineCount: 3, y: 0 })
      }
    ]);

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 1,
          range: { from: 4, to: 10 },
          pageRect: { x: 0, y: 800, width: 600, height: 800 },
          bodyRect: { x: 40, y: 850, width: 500, height: 48 },
          rect: { x: 40, y: 850, width: 500, height: 48 },
          sourceFlowY: 24,
          sourceFlowHeight: 24,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      rect: box.rect,
      text: box.textFragments?.map((fragment) => fragment.text),
      y: box.textFragments?.map((fragment) => fragment.rect.y)
    }))).toEqual([
      {
        id: "paragraph-0#p1",
        range: { from: 4, to: 7 },
        rect: { x: 40, y: 850, width: 120, height: 24 },
        text: ["L1"],
        y: [850]
      }
    ]);
  });

  it("skips incomplete measured source-flow page records without fallback projection", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 10,
        y: 0,
        height: 72,
        textFragments: createLineFragments({ lineCount: 3, y: 0 })
      }
    ]);

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 1,
          range: { from: 1, to: 7 },
          pageRect: { x: 0, y: 800, width: 600, height: 800 },
          bodyRect: { x: 40, y: 850, width: 500, height: 48 },
          rect: { x: 40, y: 850, width: 500, height: 48 },
          sourceFlowY: 24,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      text: box.textFragments?.map((fragment) => fragment.text),
      y: box.textFragments?.map((fragment) => fragment.rect.y)
    }))).toEqual([
      {
        id: "paragraph-0",
        range: { from: 1, to: 10 },
        text: ["L0", "L1", "L2"],
        y: [0, 24, 48]
      }
    ]);
  });

  it("uses measured source-flow ownership before text range intersection", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 13,
        y: 0,
        height: 48,
        textFragments: createLineFragments({ lineCount: 2, y: 0 })
      }
    ]);

    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...document,
        pages: [{
          pageIndex: 1,
          range: { from: 1, to: 4 },
          pageRect: { x: 0, y: 800, width: 600, height: 800 },
          bodyRect: { x: 40, y: 850, width: 500, height: 24 },
          rect: { x: 40, y: 850, width: 500, height: 24 },
          sourceFlowY: 24,
          sourceFlowHeight: 24,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      rect: box.rect,
      text: box.textFragments?.map((fragment) => fragment.text),
      y: box.textFragments?.map((fragment) => fragment.rect.y)
    }))).toEqual([
      {
        id: "paragraph-0#p1",
        range: { from: 4, to: 7 },
        rect: { x: 40, y: 850, width: 120, height: 24 },
        text: ["L1"],
        y: [850]
      }
    ]);
  });

  it("buckets projected children by page-local source-flow geometry before range", () => {
    const projected = projectQuireLayoutDocumentToPages({
      document: {
        ...createDocumentWithRangeMismatchedProjectedChild(),
        pages: [{
          pageIndex: 1,
          range: { from: 1, to: 5 },
          pageRect: { x: 0, y: 800, width: 600, height: 800 },
          bodyRect: { x: 40, y: 850, width: 500, height: 24 },
          rect: { x: 40, y: 850, width: 500, height: 24 },
          sourceFlowY: 24,
          sourceFlowHeight: 24,
          endInfo: { openMarks: [], openNodes: [] }
        }]
      }
    });

    expect(projected.children.map((box) => ({
      id: box.id,
      range: box.range,
      rect: box.rect,
      children: isTestLayoutContainer(box)
        ? box.children.map((child) => ({
            id: child.id,
            range: child.range,
            rect: child.rect,
            text: child.textFragments?.map((fragment) => fragment.text) ?? []
          }))
        : []
    }))).toEqual([
      {
        id: "container-0#p1",
        range: { from: 100, to: 110 },
        rect: { x: 40, y: 850, width: 120, height: 24 },
        children: [
          {
            id: "paragraph-range-mismatch#p1",
            range: { from: 100, to: 110 },
            rect: { x: 40, y: 850, width: 120, height: 24 },
            text: ["range mismatch"]
          }
        ]
      }
    ]);
  });
});

/**
 * Creates a straddling container whose child is owned by measured source-flow
 * geometry rather than by the page's semantic range.
 *
 * @returns Layout document with a range-mismatched child paragraph.
 */
function createDocumentWithRangeMismatchedProjectedChild(): QuireLayoutDocument {
  const child: QuireLayoutBox = {
    id: "paragraph-range-mismatch",
    range: { from: 100, to: 110 },
    rect: { x: 0, y: 24, width: 500, height: 24 },
    textFragments: [{
      id: "paragraph-range-mismatch:text-0",
      text: "range mismatch",
      range: { from: 100, to: 110 },
      rect: { x: 0, y: 24, width: 120, height: 24 },
      font: "16px sans-serif",
      lineHeight: 24,
      baseline: 42,
      caretStops: []
    }]
  };
  const container: QuireLayoutContainer = {
    id: "container-0",
    range: { from: 1, to: 30 },
    rect: { x: 0, y: 0, width: 500, height: 72 },
    children: [child]
  };

  return {
    id: "doc",
    range: { from: 1, to: 30 },
    rect: { x: 0, y: 0, width: 500, height: 72 },
    children: [container],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: createEmptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [],
    pages: []
  };
}

/**
 * Checks whether a test layout box owns children.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box can be treated as a container.
 */
function isTestLayoutContainer(
  box: QuireLayoutBox
): box is QuireLayoutContainer {
  return Array.isArray((box as { readonly children?: unknown }).children);
}
