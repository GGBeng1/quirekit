import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutBox } from "../../types";
import { markQuireTextFragmentsSortedByLineTop } from "@quirekit/layout/text";
import { bucketQuirePageContent } from "./content-bucket";
import type { QuirePageBodyProjection } from "./types";

describe("canvas layout page projection content buckets", () => {
  it("assigns text by measured source-flow band before document range", () => {
    const fragment = createTextFragment({
      id: "line-on-page-1",
      range: { from: 1, to: 4 },
      rect: { x: 0, y: 48, width: 40, height: 10 }
    });

    expect(bucketQuirePageContent({
      fragments: [fragment],
      children: [],
      projections: [
        createProjection({
          pageIndex: 0,
          range: { from: 1, to: 4 },
          pageY: 0,
          sourceFlowY: 0,
          sourceFlowHeight: 40
        }),
        createProjection({
          pageIndex: 1,
          range: { from: 10, to: 20 },
          pageY: 100,
          sourceFlowY: 40,
          sourceFlowHeight: 40
        })
      ]
    }).map((bucket) => bucket.pageIndex)).toEqual([1]);
  });

  it("rejects text buckets without measured source-flow ownership", () => {
    const fragment = createTextFragment({
      id: "unmeasured-range-mismatch",
      range: { from: 1, to: 4 },
      rect: { x: 0, y: 48, width: 40, height: 10 }
    });

    expect(() => bucketQuirePageContent({
      fragments: [fragment],
      children: [],
      projections: [
        createProjection({
          pageIndex: 1,
          range: { from: 10, to: 20 },
          pageY: 100
        })
      ]
    })).toThrow("Page projection requires both sourceFlowY and sourceFlowHeight.");
  });

  it("buckets sorted text fragments through measured source-flow clips", () => {
    const buckets = bucketQuirePageContent({
      fragments: [
        createTextFragment({
          id: "line-0",
          range: { from: 1, to: 4 },
          rect: { x: 0, y: 8, width: 40, height: 10 }
        }),
        createTextFragment({
          id: "line-1",
          range: { from: 4, to: 8 },
          rect: { x: 0, y: 48, width: 40, height: 10 }
        }),
        createTextFragment({
          id: "line-2",
          range: { from: 8, to: 12 },
          rect: { x: 0, y: 88, width: 40, height: 10 }
        })
      ],
      children: [],
      projections: [
        createProjection({
          pageIndex: 0,
          range: { from: 1, to: 4 },
          pageY: 0,
          sourceFlowY: 0,
          sourceFlowHeight: 40
        }),
        createProjection({
          pageIndex: 1,
          range: { from: 4, to: 8 },
          pageY: 100,
          sourceFlowY: 40,
          sourceFlowHeight: 40
        }),
        createProjection({
          pageIndex: 2,
          range: { from: 8, to: 12 },
          pageY: 200,
          sourceFlowY: 80,
          sourceFlowHeight: 40
        })
      ]
    });

    expect(buckets.map((bucket) => ({
      pageIndex: bucket.pageIndex,
      ids: bucket.fragments.map((fragment) => fragment.id),
      range: bucket.range
    }))).toEqual([
      { pageIndex: 0, ids: ["line-0"], range: { from: 1, to: 4 } },
      { pageIndex: 1, ids: ["line-1"], range: { from: 4, to: 8 } },
      { pageIndex: 2, ids: ["line-2"], range: { from: 8, to: 12 } }
    ]);
  });

  it("jumps to a late measured clip without rescanning every earlier fragment", () => {
    let rectYReads = 0;
    const fragments = Array.from({ length: 512 }, (_, index) =>
      createTextFragment({
        id: `line-${index}`,
        range: { from: index * 4 + 1, to: index * 4 + 4 },
        rect: createObservedRect({
          y: index * 20,
          onReadY: () => {
            rectYReads += 1;
          }
        })
      })
    );
    rectYReads = 0;
    const buckets = bucketQuirePageContent({
      fragments,
      children: [],
      projections: [
        createProjection({
          pageIndex: 500,
          range: { from: 2001, to: 2004 },
          pageY: 500 * 80,
          sourceFlowY: 500 * 20,
          sourceFlowHeight: 20
        })
      ]
    });

    expect(buckets.map((bucket) => ({
      pageIndex: bucket.pageIndex,
      ids: bucket.fragments.map((fragment) => fragment.id)
    }))).toEqual([
      { pageIndex: 500, ids: ["line-500"] }
    ]);
    expect(rectYReads).toBeLessThan(700);
  });

  it("uses known sorted fragment metadata without rescanning the whole array", () => {
    let rectYReads = 0;
    const fragments = markQuireTextFragmentsSortedByLineTop(Array.from({ length: 512 }, (_, index) =>
      createTextFragment({
        id: `line-${index}`,
        range: { from: index * 4 + 1, to: index * 4 + 4 },
        rect: createObservedRect({
          y: index * 20,
          onReadY: () => {
            rectYReads += 1;
          }
        })
      })
    ));
    rectYReads = 0;
    const buckets = bucketQuirePageContent({
      fragments,
      children: [],
      projections: [
        createProjection({
          pageIndex: 500,
          range: { from: 2001, to: 2004 },
          pageY: 500 * 80,
          sourceFlowY: 500 * 20,
          sourceFlowHeight: 20
        })
      ]
    });

    expect(buckets.map((bucket) => ({
      pageIndex: bucket.pageIndex,
      ids: bucket.fragments.map((fragment) => fragment.id)
    }))).toEqual([
      { pageIndex: 500, ids: ["line-500"] }
    ]);
    expect(rectYReads).toBeLessThan(80);
  });

  it("uses measured search for unordered text fragments", () => {
    const buckets = bucketQuirePageContent({
      fragments: [
        createTextFragment({
          id: "later-line",
          range: { from: 8, to: 12 },
          rect: { x: 0, y: 88, width: 40, height: 10 }
        }),
        createTextFragment({
          id: "earlier-line",
          range: { from: 1, to: 4 },
          rect: { x: 0, y: 8, width: 40, height: 10 }
        })
      ],
      children: [],
      projections: [
        createProjection({
          pageIndex: 0,
          range: { from: 1, to: 4 },
          pageY: 0,
          sourceFlowY: 0,
          sourceFlowHeight: 40
        }),
        createProjection({
          pageIndex: 2,
          range: { from: 8, to: 12 },
          pageY: 200,
          sourceFlowY: 80,
          sourceFlowHeight: 40
        })
      ]
    });

    expect(buckets.map((bucket) => ({
      pageIndex: bucket.pageIndex,
      ids: bucket.fragments.map((fragment) => fragment.id)
    }))).toEqual([
      { pageIndex: 0, ids: ["earlier-line"] },
      { pageIndex: 2, ids: ["later-line"] }
    ]);
  });

  it("assigns projected children by page-local rect before origin range", () => {
    const child = createBox({
      id: "origin-range-child",
      range: { from: 1, to: 4 },
      rect: { x: 40, y: 120, width: 120, height: 24 }
    });

    expect(bucketQuirePageContent({
      fragments: [],
      children: [child],
      projections: [
        createProjection({
          pageIndex: 0,
          range: { from: 1, to: 4 },
          pageY: 0,
          sourceFlowY: 0,
          sourceFlowHeight: 80
        }),
        createProjection({
          pageIndex: 1,
          range: { from: 10, to: 20 },
          pageY: 100,
          sourceFlowY: 80,
          sourceFlowHeight: 80
        })
      ]
    }).map((bucket) => bucket.pageIndex)).toEqual([1]);
  });

  it("rejects projected child buckets without measured range ownership", () => {
    const child = createBox({
      id: "unmeasured-origin-range-child",
      range: { from: 1, to: 4 },
      rect: { x: 40, y: 120, width: 120, height: 24 }
    });

    expect(bucketQuirePageContent({
      fragments: [],
      children: [child],
      projections: [
        createProjection({
          pageIndex: 1,
          range: { from: 1, to: 4 },
          pageY: 100
        })
      ]
    })).toEqual([]);
  });
});

/**
 * Creates a text fragment for bucket ownership tests.
 *
 * @param options - Fragment identity, range, and rectangle.
 * @returns Text fragment fixture.
 */
function createTextFragment(options: {
  /** Stable fragment id. */
  readonly id: string;
  /** Source document range. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow rectangle. */
  readonly rect: QuireRect;
}): QuireTextFragment {
  return {
    id: options.id,
    text: "line",
    range: options.range,
    rect: options.rect,
    font: "12px test",
    lineHeight: options.rect.height,
    baseline: options.rect.y + options.rect.height,
    caretStops: []
  };
}

/**
 * Creates a rectangle that counts reads of its `y` coordinate.
 *
 * @param options - Rectangle y value and read callback.
 * @returns Rectangle fixture with an observable y getter.
 */
function createObservedRect(options: {
  /** Source-flow y coordinate exposed by the rectangle. */
  readonly y: number;
  /** Callback invoked whenever the y coordinate is read. */
  readonly onReadY: () => void;
}): QuireRect {
  return {
    x: 0,
    get y(): number {
      options.onReadY();
      return options.y;
    },
    width: 40,
    height: 10
  };
}

/**
 * Creates a layout box for projected-child ownership tests.
 *
 * @param options - Box identity, range, and page-local rectangle.
 * @returns Layout box fixture.
 */
function createBox(options: {
  /** Stable box id. */
  readonly id: string;
  /** Source document range. */
  readonly range: QuireLayoutBox["range"];
  /** Page-local rectangle. */
  readonly rect: QuireRect;
}): QuireLayoutBox {
  return {
    id: options.id,
    range: options.range,
    rect: options.rect
  };
}

/**
 * Creates a page-body projection for bucket ownership tests.
 *
 * @param options - Page index, range, visual y, and optional source-flow band.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Document range covered by the page. */
  readonly range: QuirePageFragment["range"];
  /** Page visual y coordinate. */
  readonly pageY: number;
  /** Optional measured source-flow y coordinate. */
  readonly sourceFlowY?: number | undefined;
  /** Optional measured source-flow height. */
  readonly sourceFlowHeight?: number | undefined;
}): QuirePageBodyProjection {
  const rect = { x: 40, y: options.pageY, width: 500, height: 80 };

  return {
    page: {
      pageIndex: options.pageIndex,
      range: options.range,
      pageRect: rect,
      bodyRect: rect,
      rect,
      sourceFlowY: options.sourceFlowY,
      sourceFlowHeight: options.sourceFlowHeight,
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: 40,
    dy: options.pageY
  };
}
