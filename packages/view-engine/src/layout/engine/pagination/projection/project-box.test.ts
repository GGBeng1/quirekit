import { describe, expect, it, vi } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutBox } from "../../types";
import { projectQuireLayoutBoxes } from "./project-box";
import type { QuirePageBodyProjection } from "./types";

describe("canvas page box projection", () => {
  it("preserves full projection when the runtime has no WeakRef", () => {
    const box = createBox({ fragments: [createFragment({ from: 1, to: 4, y: 20 })] });
    const projections = [createProjection({
      pageIndex: 0, range: { from: 0, to: 10 }, bodyY: 100, dy: 80,
      sourceFlowY: 20, sourceFlowHeight: 60
    })];
    vi.stubGlobal("WeakRef", undefined);
    try {
      const first = projectQuireLayoutBoxes([box], projections);
      const rebuilt = projectQuireLayoutBoxes([box], projections);
      expect(first[0]?.rect).toEqual({ x: 0, y: 100, width: 200, height: 60 });
      expect(first[0]?.textFragments?.[0]?.baseline).toBe(108);
      expect(rebuilt).toEqual(first);
      expect(rebuilt).not.toBe(first);
      expect(box.rect.y).toBe(20);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps measured range-contained boxes on the whole-box projection path", () => {
    const box = createBox({
      fragments: [createFragment({ from: 1, to: 4, y: 20 })]
    });

    expect(projectQuireLayoutBoxes([box], [
      createProjection({
        pageIndex: 0,
        range: { from: 0, to: 10 },
        bodyY: 100,
        dy: 80,
        sourceFlowY: 20,
        sourceFlowHeight: 60
      })
    ])).toEqual([
      {
        ...box,
        rect: { x: 0, y: 100, width: 200, height: 60 },
        textFragments: [
          {
            ...box.textFragments![0],
            rect: { x: 0, y: 100, width: 100, height: 10 },
            baseline: 108
          }
        ]
      }
    ]);
  });

  it("splits range-contained boxes when measured source-flow bands do not own the whole rect", () => {
    const box = createBox({
      fragments: [
        createFragment({ from: 1, to: 4, y: 20 }),
        createFragment({ from: 4, to: 8, y: 60 })
      ]
    });

    expect(projectQuireLayoutBoxes([box], [
      createProjection({
        pageIndex: 0,
        range: { from: 0, to: 10 },
        bodyY: 100,
        dy: 80,
        sourceFlowY: 20,
        sourceFlowHeight: 20
      }),
      createProjection({
        pageIndex: 1,
        range: { from: 0, to: 10 },
        bodyY: 300,
        dy: 240,
        sourceFlowY: 60,
        sourceFlowHeight: 20
      })
    ])).toEqual([
      {
        ...box,
        id: "paragraph#p0",
        range: { from: 1, to: 4 },
        rect: { x: 0, y: 100, width: 100, height: 10 },
        textFragments: [
          {
            ...box.textFragments![0],
            rect: { x: 0, y: 100, width: 100, height: 10 },
            baseline: 108
          }
        ]
      },
      {
        ...box,
        id: "paragraph#p1",
        range: { from: 4, to: 8 },
        rect: { x: 0, y: 300, width: 100, height: 10 },
        textFragments: [
          {
            ...box.textFragments![1],
            rect: { x: 0, y: 300, width: 100, height: 10 },
            baseline: 308
          }
        ]
      }
    ]);
  });

  it("emits aggregate project-loop diagnostics for complete and split boxes", () => {
    const traceNames: string[] = [];

    projectQuireLayoutBoxes(
      [
        createBox({
          fragments: [createFragment({ from: 1, to: 4, y: 20 })]
        }),
        createBox({
          fragments: [
            createFragment({ from: 10, to: 14, y: 20 }),
            createFragment({ from: 14, to: 18, y: 60 })
          ]
        })
      ],
      [
        createProjection({
          pageIndex: 0,
          range: { from: 0, to: 20 },
          bodyY: 100,
          dy: 80,
          sourceFlowY: 20,
          sourceFlowHeight: 20
        }),
        createProjection({
          pageIndex: 1,
          range: { from: 0, to: 20 },
          bodyY: 300,
          dy: 240,
          sourceFlowY: 60,
          sourceFlowHeight: 20
        })
      ],
      (phase) => {
        traceNames.push(phase.name);
      }
    );

    expect(traceNames).toEqual(expect.arrayContaining([
      "layout:paginate:project:boxes:project-loop:complete-ownership",
      "layout:paginate:project:boxes:project-loop:complete-translate",
      "layout:paginate:project:boxes:project-loop:split-leaf",
      "layout:paginate:project:boxes:project-loop:split-container"
    ]));
  });
});

/**
 * Creates a layout box fixture.
 *
 * @param options - Text fragments owned by the box.
 * @returns Layout box fixture in source-flow coordinates.
 */
function createBox(options: {
  /** Text fragments owned by the box. */
  readonly fragments: readonly QuireTextFragment[];
}): QuireLayoutBox {
  return {
    id: "paragraph",
    range: { from: 0, to: 10 },
    rect: { x: 0, y: 20, width: 200, height: 60 },
    textFragments: options.fragments
  };
}

/**
 * Creates one text fragment fixture.
 *
 * @param options - Source range and source-flow line top.
 * @returns Text fragment fixture.
 */
function createFragment(options: {
  /** Source range start. */
  readonly from: number;
  /** Source range end. */
  readonly to: number;
  /** Source-flow line top. */
  readonly y: number;
}): QuireTextFragment {
  return {
    id: `line-${options.from}`,
    text: "line",
    range: { from: options.from, to: options.to },
    rect: { x: 0, y: options.y, width: 100, height: 10 },
    font: "12px test",
    lineHeight: 10,
    baseline: options.y + 8,
    caretStops: []
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Page range, offsets, and optional measured source-flow band.
 * @returns Projection fixture.
 */
function createProjection(options: {
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Page document range. */
  readonly range: QuirePageFragment["range"];
  /** Page body y coordinate. */
  readonly bodyY: number;
  /** Vertical projection offset. */
  readonly dy: number;
  /** Optional measured source-flow y coordinate. */
  readonly sourceFlowY?: number | undefined;
  /** Optional measured source-flow height. */
  readonly sourceFlowHeight?: number | undefined;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: options.pageIndex,
      range: options.range,
      pageRect: { x: 0, y: options.bodyY - 20, width: 400, height: 200 },
      bodyRect: { x: 0, y: options.bodyY, width: 300, height: 160 },
      rect: { x: 0, y: options.bodyY, width: 300, height: 160 },
      sourceFlowY: options.sourceFlowY,
      sourceFlowHeight: options.sourceFlowHeight,
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: 0,
    dy: options.dy
  };
}
