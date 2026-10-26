import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type {
  QuireTextCaretStop,
  QuireTextFragment
} from "@quirekit/layout/text";
import type { QuireLayoutBox } from "../../types";
import type {
  QuireTableCellFragment,
  QuireTableLayoutSnapshot
} from "../../table";
import type { QuireLayoutBoxSubLayoutFragment } from "../../sub-layout";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../../test-support/layout/table-cell-sub-layout";
import {
  createQuireTableCellChildrenPageProjection
} from "./table-cell-children";
import type { QuirePageBodyProjection } from "./types";

describe("canvas table cell child projection", () => {
  it("exposes body cell child fragments through the recursive cell contract", () => {
    const [fragment] = createBodySubLayoutFragments({
      sourceChildren: [
        createBox({
          id: "cell-a",
          rect: { x: 10, y: 20, width: 90, height: 60 },
          textFragments: [
            createFragment({
              id: "line-a",
              range: { from: 1, to: 4 },
              y: 22,
              baseline: 30
            }),
            createFragment({
              id: "line-b",
              range: { from: 4, to: 8 },
              y: 36,
              baseline: 44,
              caretStops: [
                { position: { pos: 4, bias: 1 }, localX: 0 },
                { position: { pos: 8, bias: -1 }, localX: 90 }
              ]
            })
          ]
        })
      ],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a#p1",
            rect: { x: 110, y: 236, width: 90, height: 38 },
            contentRect: { x: 110, y: 240, width: 90, height: 30 },
            range: { from: 4, to: 8 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    });

    expect(fragment?.subLayout.geometry.acceptedBand).toEqual({
      top: 40,
      bottom: 70
    });
    expect(fragment?.subLayout.geometry.root).toMatchObject({
      id: "test-table-cell:semantic-a",
      kind: "table-cell",
      range: { from: 4, to: 8 },
      placement: {
        parentId: "table#p1",
        rect: { x: 110, y: 236, width: 90, height: 38 },
        contentRect: { x: 110, y: 240, width: 90, height: 30 }
      },
      localRect: { x: 10, y: 20, width: 90, height: 60 },
      writingMode: "horizontal-tb",
      metadata: {
        tableCell: expect.objectContaining({
          cellId: "cell-a#p1",
          semanticCellId: "semantic-a",
          originExplicitCellId: "cell-a"
        })
      }
    });
    expect(fragment?.subLayout.view.root.sourceBox).toMatchObject({
      id: "cell-a"
    });
    expect(fragment?.subLayout.geometry).toMatchObject({
      id: "test-table-cell:semantic-a:table#p1:source-flow:40-70",
      acceptedBand: { top: 40, bottom: 70 },
      localToResult: { x: 100, y: 200 },
      contentClip: { x: 110, y: 240, width: 90, height: 30 },
      interactionClip: { x: 110, y: 240, width: 90, height: 30 },
      continuation: {
        rootId: "test-table-cell:semantic-a",
        range: { from: 4, to: 8 },
        nextSourceFlowY: 70,
        previousAcceptedBand: { top: 40, bottom: 70 },
        remainingSourceFlowBand: { top: 70, bottom: 80 },
        pageIndex: 1,
        parentFragmentId: "table#p1",
        previousResultId: "test-table-cell:semantic-a:table#p1:source-flow:40-70",
        adapterState: {
          sourceChildId: "cell-a",
          tableCell: expect.objectContaining({
            cellId: "cell-a#p1",
            semanticCellId: "semantic-a",
            originExplicitCellId: "cell-a",
            gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 }
          }),
          projectionKind: "table-body-cell",
          tablePolicy: {
            gridRect: {
              startRow: 0,
              rowSpan: 1,
              startColumn: 0,
              columnSpan: 1
            },
            borders: null,
            cellMargins: null,
            shading: null,
            verticalAlign: null,
            isRepeatedHeader: false,
            visualClip: { x: 110, y: 236, width: 90, height: 38 },
            contentClip: { x: 110, y: 240, width: 90, height: 30 },
            sourceVisualRect: { x: 10, y: 36, width: 90, height: 38 },
            sourceContentRect: { x: 10, y: 40, width: 90, height: 30 }
          }
        },
        dependencySignature: "table-body-cell|table#p1|cell-a#p1|110|240|90|30|40|30|10|20|90|60"
      },
      fragments: [
        expect.objectContaining({
          id: "cell-a#p1",
          sourceId: "cell-a",
          range: { from: 4, to: 8 },
          rect: { x: 110, y: 240, width: 90, height: 30 },
          localRect: { x: 10, y: 40, width: 90, height: 30 }
        })
      ]
    });
    expect(fragment?.subLayout.view.queryProducts).toMatchObject({
        selectionRects: [
          {
            range: { from: 4, to: 8 },
            rect: { x: 110, y: 240, width: 90, height: 10 }
          }
        ],
        caretStops: [
          {
            position: { pos: 4, bias: 1 },
            rect: { x: 110, y: 240, width: 1, height: 10 },
            fragmentId: "cell-a#p1"
          },
          {
            position: { pos: 8, bias: -1 },
            rect: { x: 200, y: 240, width: 1, height: 10 },
            fragmentId: "cell-a#p1"
          }
        ],
        hitTargets: [
          {
            id: "cell-a#p1:sub-layout-hit",
            range: { from: 4, to: 8 },
            rect: { x: 110, y: 240, width: 90, height: 30 }
          },
          {
            id: "cell-a#p1:sub-layout-trailing-blank-hit",
            range: { from: 4, to: 8 },
            rect: { x: 110, y: 240, width: 90, height: 30 }
          }
        ],
        inputAnchors: [
          {
            position: { pos: 4, bias: 1 },
            rect: { x: 110, y: 240, width: 1, height: 10 },
            role: "caret"
          },
          {
            position: { pos: 8, bias: -1 },
            rect: { x: 200, y: 240, width: 1, height: 10 },
            role: "caret"
          }
        ]
    });
    expect(fragment?.subLayout.geometry.dependencySignature).toBe(
      "table-body-cell|table#p1|cell-a#p1|110|240|90|30|40|30|10|20|90|60"
    );
    const [fragmentSource] = fragment?.subLayout.view.fragmentSources ?? [];
    expect(fragmentSource?.sourceBox).toBeDefined();
    expect(fragmentSource?.sourceBox.id).toBe("cell-a#p1");
    expect(fragmentSource?.sourceBox.textFragments?.map((item) => item.id))
      .toEqual(["line-b"]);
    expect(fragmentSource?.sourceBox.textFragments?.[0]?.rect.y).toBe(240);
  });

  it("returns provenance fragments and repeated-header children together", () => {
    const projection = createQuireTableCellChildrenPageProjection({
      sourceChildren: [
        createBox({
          id: "cell-a",
          rect: { x: 10, y: 20, width: 90, height: 60 },
          textFragments: [
            createFragment({
              id: "header-line",
              range: { from: 1, to: 4 },
              y: 24,
              baseline: 32
            }),
            createFragment({
              id: "body-line",
              range: { from: 4, to: 8 },
              y: 36,
              baseline: 44
            })
          ]
        })
      ],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a:repeat-p1",
            rect: { x: 120, y: 220, width: 90, height: 34 },
            contentRect: { x: 120, y: 220, width: 90, height: 30 },
            contentLayoutRect: { x: 130, y: 230, width: 90, height: 30 },
            isRepeatedHeader: true,
            range: { from: 1, to: 4 }
          }),
          createCell({
            id: "cell-a#p1",
            rect: { x: 110, y: 236, width: 90, height: 38 },
            contentRect: { x: 110, y: 240, width: 90, height: 30 },
            range: { from: 4, to: 8 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    });

    expect(projection.subLayoutFragments).toHaveLength(2);
    expect(
      projection.subLayoutFragments[0]?.subLayout
        .view.fragmentSources[0]?.sourceBox.id
    ).toBe("cell-a:repeat-p1");
    expect(
      projection.subLayoutFragments[1]?.subLayout
        .view.fragmentSources[0]?.sourceBox.id
    ).toBe("cell-a#p1");
    expect(projection.subLayoutFragments[0]?.subLayout.geometry.continuation)
      .toBe(null);
    expect(projection.subLayoutFragments[1]?.subLayout.geometry.continuation)
      .toMatchObject({ adapterState: { projectionKind: "table-body-cell" } });
  });

  it("keeps row-span identity inside generic body-cell continuation state", () => {
    const [fragment] = createBodySubLayoutFragments({
      sourceChildren: [
        createBox({
          id: "cell-a",
          rect: { x: 10, y: 20, width: 90, height: 60 },
          textFragments: [
            createFragment({
              id: "line-a",
              range: { from: 4, to: 8 },
              y: 24,
              baseline: 32
            })
          ]
        })
      ],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a#p1",
            rect: { x: 110, y: 216, width: 90, height: 38 },
            contentRect: { x: 110, y: 220, width: 90, height: 30 },
            gridRect: {
              startRow: 0,
              rowSpan: 2,
              startColumn: 0,
              columnSpan: 1
            },
            range: { from: 4, to: 8 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    });

    expect(fragment?.subLayout.geometry.continuation).toMatchObject({
      nextSourceFlowY: 50,
      remainingSourceFlowBand: { top: 50, bottom: 80 },
      adapterState: {
        tableCell: expect.objectContaining({
          gridRect: {
            startRow: 0,
            rowSpan: 2,
            startColumn: 0,
            columnSpan: 1
          }
        }),
        tablePolicy: expect.objectContaining({
          gridRect: {
            startRow: 0,
            rowSpan: 2,
            startColumn: 0,
            columnSpan: 1
          }
        })
      }
    });
  });

  it("clips body cell child flow through the page-local cell content rect", () => {
    const [fragment] = createBodySubLayoutFragments({
      sourceChildren: [
        createBox({
          id: "cell-a",
          rect: { x: 10, y: 20, width: 90, height: 60 },
          textFragments: [
            createFragment({
              id: "line-a",
              range: { from: 1, to: 4 },
              y: 22,
              baseline: 30
            }),
            createFragment({
              id: "line-b",
              range: { from: 4, to: 8 },
              y: 36,
              baseline: 44
            })
          ]
        })
      ],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a#p1",
            rect: { x: 110, y: 236, width: 90, height: 38 },
            contentRect: { x: 110, y: 240, width: 90, height: 30 },
            range: { from: 4, to: 8 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    });
    const [fragmentSource] = fragment?.subLayout.view.fragmentSources ?? [];
    const projected = fragmentSource?.sourceBox;

    expect(projected?.id).toBe("cell-a#p1");
    expect(projected?.range).toEqual({ from: 4, to: 8 });
    expect(projected?.rect).toEqual({ x: 110, y: 240, width: 90, height: 30 });
    expect(projected?.textFragments?.map((fragment) => fragment.id)).toEqual([
      "line-b"
    ]);
    expect(projected?.textFragments?.[0]?.rect.y).toBe(240);
    expect(projected?.textFragments?.[0]?.baseline).toBe(248);
  });

  it("uses the cell source-flow height before projecting body cell children", () => {
    const [fragment] = createBodySubLayoutFragments({
      sourceChildren: [
        createBox({
          id: "cell-a",
          rect: { x: 10, y: 20, width: 90, height: 60 },
          textFragments: [
            createFragment({
              id: "line-b",
              range: { from: 4, to: 8 },
              y: 36,
              baseline: 44
            }),
            createFragment({
              id: "line-c",
              range: { from: 8, to: 12 },
              y: 52,
              baseline: 60
            })
          ]
        })
      ],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a#p1",
            rect: { x: 110, y: 236, width: 90, height: 38 },
            contentRect: { x: 110, y: 240, width: 90, height: 30 },
            cellSourceFlowY: 20,
            cellSourceFlowHeight: 12,
            range: { from: 4, to: 12 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    });
    const [fragmentSource] = fragment?.subLayout.view.fragmentSources ?? [];
    const projected = fragmentSource?.sourceBox;

    expect(projected?.id).toBe("cell-a#p1");
    expect(projected?.range).toEqual({ from: 4, to: 8 });
    expect(projected?.rect).toEqual({ x: 110, y: 240, width: 90, height: 12 });
    expect(projected?.textFragments?.map((fragment) => fragment.id)).toEqual([
      "line-b"
    ]);
    expect(projected?.textFragments?.[0]?.rect.y).toBe(240);
    expect(projected?.textFragments?.[0]?.baseline).toBe(248);
    expect(fragment?.subLayout.geometry.continuation).toMatchObject({
      nextSourceFlowY: 52,
      previousAcceptedBand: { top: 40, bottom: 52 },
      remainingSourceFlowBand: { top: 52, bottom: 80 },
      pageIndex: 1,
      parentFragmentId: "table#p1",
      adapterState: {
        sourceChildId: "cell-a",
        projectionKind: "table-body-cell"
      }
    });
  });

  it("clones repeated header child flow into repeated cell layout rects", () => {
    const [fragment] = createQuireTableCellChildrenPageProjection({
      sourceChildren: [
        createBox({
          id: "cell-a",
          rect: { x: 10, y: 20, width: 90, height: 30 },
          textFragments: [
            createFragment({
              id: "header-line",
              range: { from: 1, to: 8 },
              y: 24,
              baseline: 32
            })
          ]
        })
      ],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a:repeat-p1",
            rect: { x: 120, y: 220, width: 90, height: 34 },
            contentRect: { x: 120, y: 220, width: 90, height: 30 },
            contentLayoutRect: { x: 130, y: 230, width: 90, height: 30 },
            isRepeatedHeader: true,
            range: { from: 1, to: 8 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    }).subLayoutFragments;
    const projected = fragment?.subLayout.view.fragmentSources[0]?.sourceBox;

    expect(fragment?.subLayout.geometry.fragments[0]?.sourceId).toBe("cell-a");
    expect(fragment?.subLayout.geometry.acceptedBand).toEqual({
      top: 20,
      bottom: 50
    });
    expect(fragment?.subLayout.geometry.contentClip).toEqual({
      x: 130,
      y: 230,
      width: 90,
      height: 30
    });
    expect(projected?.id).toBe("cell-a:repeat-p1");
    expect(projected?.rect).toEqual({ x: 130, y: 230, width: 90, height: 30 });
    expect(projected?.textFragments?.[0]?.id).toBe("header-line:repeat-p1");
    expect(projected?.textFragments?.[0]?.rect.y).toBe(234);
    expect(projected?.textFragments?.[0]?.baseline).toBe(242);
    expect(fragment?.subLayout.geometry.continuation).toBe(null);
  });

  it("preserves source cell insets when cloning repeated header child flow", () => {
    const sourceCell = createCell({
      id: "cell-a",
      rect: { x: 10, y: 20, width: 90, height: 34 },
      contentRect: { x: 20, y: 30, width: 70, height: 18 },
      contentLayoutRect: { x: 20, y: 34, width: 70, height: 10 },
      range: { from: 1, to: 8 }
    });
    const sourceBox = retainQuireTestTableCellSubLayoutIdentity(
      {
        id: "cell-a",
        range: { from: 1, to: 8 },
        rect: sourceCell.rect,
        textFragments: [
          createFragment({
            id: "header-line",
            range: { from: 1, to: 8 },
            x: 22,
            y: 34,
            baseline: 42
          })
        ]
      },
      sourceCell
    );
    const [fragment] = createQuireTableCellChildrenPageProjection({
      sourceChildren: [sourceBox],
      table: createTable({
        cells: [
          createCell({
            id: "cell-a:repeat-p1",
            rect: { x: 120, y: 220, width: 90, height: 34 },
            contentRect: { x: 130, y: 230, width: 70, height: 18 },
            contentLayoutRect: { x: 130, y: 234, width: 70, height: 10 },
            isRepeatedHeader: true,
            range: { from: 1, to: 8 }
          })
        ]
      }),
      projection: createProjection({ dx: 100, dy: 200 })
    }).subLayoutFragments;
    const projected = fragment?.subLayout.view.fragmentSources[0]?.sourceBox;

    expect(projected?.rect).toEqual({ x: 120, y: 220, width: 90, height: 34 });
    expect(projected?.textFragments?.[0]?.rect).toEqual({
      x: 132,
      y: 234,
      width: 90,
      height: 10
    });
    expect(projected?.textFragments?.[0]?.baseline).toBe(242);
  });
});

/**
 * Projects body-only table-cell children through the public page projection.
 *
 * @param options - Source children, projected table snapshot, and projection.
 * @returns Ordered sub-layout fragments for the projected table.
 */
function createBodySubLayoutFragments(
  options: Parameters<typeof createQuireTableCellChildrenPageProjection>[0]
): readonly QuireLayoutBoxSubLayoutFragment[] {
  return createQuireTableCellChildrenPageProjection(options).subLayoutFragments;
}

/**
 * Creates a layout box fixture.
 *
 * @param options - Box id, rectangle, and text fragments.
 * @returns Layout box fixture.
 */
function createBox(options: {
  /** Stable box id. */
  readonly id: string;
  /** Source-flow rectangle. */
  readonly rect: QuireRect;
  /** Text fragments owned by the box. */
  readonly textFragments: readonly QuireTextFragment[];
}): QuireLayoutBox {
  return retainQuireTestTableCellSubLayoutIdentity({
    id: options.id,
    range: unionFragmentRange(options.textFragments),
    rect: options.rect,
    textFragments: options.textFragments
  }, {
    id: options.id,
    semanticCellId: "semantic-a",
    originExplicitCellId: "cell-a",
    explicitCellIds: ["cell-a"],
    originCellPos: 1,
    range: unionFragmentRange(options.textFragments),
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect: { startRow: 0, rowSpan: 1, startColumn: 0, columnSpan: 1 },
    rect: options.rect,
    contentRect: options.rect,
    contentChildren: []
  });
}

/**
 * Creates a text fragment fixture.
 *
 * @param options - Fragment id, range, line top, and baseline.
 * @returns Text fragment fixture.
 */
function createFragment(options: {
  /** Stable fragment id. */
  readonly id: string;
  /** Source document range. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow line top. */
  readonly y: number;
  /** Optional source-flow line left. */
  readonly x?: number | undefined;
  /** Source-flow baseline. */
  readonly baseline: number;
  /** Optional caret stops in fragment-local coordinates. */
  readonly caretStops?: readonly QuireTextCaretStop[] | undefined;
}): QuireTextFragment {
  return {
    id: options.id,
    text: "line",
    range: options.range,
    rect: { x: options.x ?? 10, y: options.y, width: 90, height: 10 },
    font: "12px test",
    lineHeight: 10,
    baseline: options.baseline,
    caretStops: options.caretStops ?? []
  };
}

/**
 * Creates a table snapshot fixture.
 *
 * @param options - Table cells.
 * @returns Table snapshot fixture.
 */
function createTable(options: {
  /** Cell fragments included in the table snapshot. */
  readonly cells: readonly QuireTableCellFragment[];
}): QuireTableLayoutSnapshot {
  return {
    tableId: "table",
    fragmentId: "table#p1",
    geometryId: "table#p1",
    tableRange: { from: 1, to: 20 },
    style: {} as QuireTableLayoutSnapshot["style"],
    borders: null,
    rect: { x: 100, y: 200, width: 200, height: 100 },
    tracks: [],
    rows: [],
    cells: options.cells,
    hitTargets: []
  };
}

/**
 * Creates a table cell fixture.
 *
 * @param options - Cell id, rectangles, repeated state, and range.
 * @returns Table cell fixture.
 */
function createCell(options: {
  /** Stable cell id. */
  readonly id: string;
  /** Page-local full cell rectangle. */
  readonly rect: QuireRect;
  /** Page-local content clipping rectangle. */
  readonly contentRect: QuireRect;
  /** Optional cell-local content flow top accepted by this fragment. */
  readonly cellSourceFlowY?: QuireTableCellFragment["cellSourceFlowY"];
  /** Optional cell-local content flow height accepted by this fragment. */
  readonly cellSourceFlowHeight?: QuireTableCellFragment["cellSourceFlowHeight"];
  /** Optional source grid rectangle for row-span continuation coverage. */
  readonly gridRect?: QuireTableCellFragment["gridRect"];
  /** Optional page-local content layout rectangle. */
  readonly contentLayoutRect?: QuireRect | undefined;
  /** Whether this cell is a repeated header visual clone. */
  readonly isRepeatedHeader?: boolean | undefined;
  /** Source document range represented by this cell. */
  readonly range: QuireTextFragment["range"];
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: "semantic-a",
    originExplicitCellId: "cell-a",
    explicitCellIds: ["cell-a"],
    originCellPos: 1,
    range: options.range,
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect: options.gridRect ?? {
      startRow: 0,
      rowSpan: 1,
      startColumn: 0,
      columnSpan: 1
    },
    rect: options.rect,
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
    contentChildren: [],
    ...(options.isRepeatedHeader === undefined
      ? {}
      : { isRepeatedHeader: options.isRepeatedHeader })
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
      range: { from: 1, to: 20 },
      pageRect: { x: 0, y: 200, width: 400, height: 300 },
      bodyRect: { x: 100, y: 200, width: 200, height: 200 },
      rect: { x: 100, y: 200, width: 200, height: 200 },
      sourceFlowY: 0,
      sourceFlowHeight: 200,
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: options.dx,
    dy: options.dy
  };
}

/**
 * Computes the document range spanned by text fragments.
 *
 * @param fragments - Text fragments to measure.
 * @returns Range spanning all fragments.
 */
function unionFragmentRange(
  fragments: readonly QuireTextFragment[]
): QuireTextFragment["range"] {
  return {
    from: Math.min(...fragments.map((fragment) => fragment.range.from)),
    to: Math.max(...fragments.map((fragment) => fragment.range.to))
  };
}
