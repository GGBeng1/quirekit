import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutBox } from "../../../types";
import {
  findQuirePageBodyProjectionForCompleteBox,
  findQuirePageBodyProjectionForProjectedChild,
  findQuirePageBodyProjectionForTextFragment
} from "./ownership";
import type { QuirePageBodyProjection } from "../types";

describe("canvas page projection ownership", () => {
  it("assigns text fragments by measured source-flow band before range", () => {
    const projection = findQuirePageBodyProjectionForTextFragment(
      createTextFragment({
        range: { from: 1, to: 4 },
        rect: { x: 0, y: 48, width: 80, height: 10 }
      }),
      [
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
    );

    expect(projection?.page.pageIndex).toBe(1);
  });

  it("assigns projected children by page-local rect before origin range", () => {
    const projection = findQuirePageBodyProjectionForProjectedChild(
      createBox({
        id: "child#p1",
        range: { from: 1, to: 4 },
        rect: { x: 40, y: 120, width: 120, height: 24 }
      }),
      [
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
    );

    expect(projection?.page.pageIndex).toBe(1);
  });

  it("requires measured flow ownership before whole-box projection", () => {
    const projection = findQuirePageBodyProjectionForCompleteBox(
      createBox({
        id: "paragraph",
        range: { from: 1, to: 10 },
        rect: { x: 0, y: 20, width: 200, height: 60 },
        textFragments: [
          createTextFragment({
            range: { from: 1, to: 4 },
            rect: { x: 0, y: 20, width: 80, height: 10 }
          })
        ]
      }),
      [
        createProjection({
          pageIndex: 0,
          range: { from: 1, to: 10 },
          pageY: 100,
          sourceFlowY: 20,
          sourceFlowHeight: 20
        })
      ]
    );

    expect(projection).toBeUndefined();
  });

  it("rejects whole-box ownership without measured source-flow bands", () => {
    expect(() =>
      findQuirePageBodyProjectionForCompleteBox(
        createBox({
          id: "unmeasured-paragraph",
          range: { from: 1, to: 10 },
          rect: { x: 0, y: 20, width: 200, height: 60 },
          textFragments: [
            createTextFragment({
              range: { from: 1, to: 4 },
              rect: { x: 0, y: 20, width: 80, height: 10 }
            })
          ]
        }),
        [
          createProjection({
            pageIndex: 0,
            range: { from: 1, to: 10 },
            pageY: 100,
            rectHeight: 40,
            dy: 100
          })
        ]
      )
    ).toThrow("Page projection requires both sourceFlowY and sourceFlowHeight.");
  });

  it("keeps unsplittable boxes on the range-owned fast path", () => {
    const projection = findQuirePageBodyProjectionForCompleteBox(
      createBox({
        id: "anchor",
        range: { from: 1, to: 10 },
        rect: { x: 0, y: 20, width: 200, height: 60 }
      }),
      [
        createProjection({
          pageIndex: 0,
          range: { from: 1, to: 10 },
          pageY: 100,
          sourceFlowY: 20,
          sourceFlowHeight: 20
        })
      ]
    );

    expect(projection?.page.pageIndex).toBe(0);
  });
});

/**
 * Creates a text fragment for ownership tests.
 *
 * @param options - Fragment range and source-flow rectangle.
 * @returns Text fragment fixture.
 */
function createTextFragment(options: {
  /** Source document range represented by the fragment. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow rectangle. */
  readonly rect: QuireRect;
}): QuireTextFragment {
  return {
    id: "line",
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
 * Creates a layout box for ownership tests.
 *
 * @param options - Box identity, range, rectangle, and optional text fragments.
 * @returns Layout box fixture.
 */
function createBox(options: {
  /** Stable box id. */
  readonly id: string;
  /** Source document range represented by the box. */
  readonly range: QuireLayoutBox["range"];
  /** Box rectangle. */
  readonly rect: QuireRect;
  /** Optional text fragments owned by the box. */
  readonly textFragments?: readonly QuireTextFragment[] | undefined;
}): QuireLayoutBox {
  return {
    id: options.id,
    range: options.range,
    rect: options.rect,
    ...(options.textFragments === undefined
      ? {}
      : { textFragments: options.textFragments })
  };
}

/**
 * Creates a page-body projection for ownership tests.
 *
 * @param options - Page index, range, visual y, and measured source-flow band.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Document range covered by the page. */
  readonly range: QuirePageFragment["range"];
  /** Page visual y coordinate. */
  readonly pageY: number;
  /** Optional page body height. */
  readonly rectHeight?: number | undefined;
  /** Optional measured source-flow y coordinate. */
  readonly sourceFlowY?: number | undefined;
  /** Optional measured source-flow height. */
  readonly sourceFlowHeight?: number | undefined;
  /** Optional vertical projection offset. */
  readonly dy?: number | undefined;
}): QuirePageBodyProjection {
  const rect = {
    x: 40,
    y: options.pageY,
    width: 500,
    height: options.rectHeight ?? 80
  };

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
    dy: options.dy ?? options.pageY - (options.sourceFlowY ?? 0)
  };
}
