import type { QuireTableCellFragment, QuireTableLayoutSnapshot } from "../layout";
import type { QuireLayoutSnapshot } from "../editor-layout";
import { describe, expect, it } from "vitest";
import {
  createQuirePointerClickTracker,
  hitTestQuirePointerNearestCaret,
  mapClientPointToQuirePoint,
  measureQuireClientPointDistance
} from "./pointer";

const snapshot = {
  state: {} as QuireLayoutSnapshot["state"],
  documentRect: { x: 40, y: 44, width: 300, height: 24 },
  viewportRect: { x: 40, y: 44, width: 300, height: 160 },
  domOverlays: [],
  hitTargets: [],
  root: {
    id: "doc",
    kind: "block",
    range: { from: 0, to: 5 },
    rect: { x: 40, y: 44, width: 300, height: 24 },
    children: [
      {
        id: "paragraph-0",
        kind: "block",
        range: { from: 0, to: 5 },
        rect: { x: 40, y: 44, width: 300, height: 24 },
        children: []
      }
    ]
  }
} satisfies QuireLayoutSnapshot;

const bodyRegion = {
  rootId: { value: "root:body" },
  regionId: { value: "region:body" },
  kind: "body"
} as const;

describe("canvas pointer hit testing", () => {
  it("maps browser client coordinates into canvas coordinates", () => {
    expect(
      mapClientPointToQuirePoint({
        clientPoint: { clientX: 180, clientY: 254 },
        canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
      })
    ).toEqual({ x: 80, y: 54 });
  });

  it("hit-tests converted browser coordinates against the layout snapshot", () => {
    const result = hitTestQuirePointerNearestCaret({
      snapshot,
      clientPoint: { clientX: 180, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "position",
      position: { pos: 0, bias: 1 },
      inside: 0,
      rect: { x: 40, y: 44, width: 300, height: 24 }
    }));
    expect(result.diagnostics).toEqual(expect.objectContaining({
      querySource: "retained-nearest-caret",
      coordinatePath: expect.objectContaining({
        spaces: ["client", "document"],
        path: {
          spaces: ["client", "document"],
          steps: [
            {
              from: "client",
              to: "document",
              input: { space: "client", x: 180, y: 254 },
              output: { space: "document", x: 80, y: 54 },
              scaleX: 1,
              scaleY: 1
            }
          ]
        },
        documentPoint: { x: 80, y: 54 }
      })
    }));
  });

  it("returns a miss for converted browser coordinates outside document bounds", () => {
    expect(
      hitTestQuirePointerNearestCaret({
        snapshot,
        clientPoint: { clientX: 120, clientY: 220 },
        canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
      })
    ).toEqual(expect.objectContaining({
      kind: "miss",
      diagnostics: expect.objectContaining({
        querySource: "retained-nearest-caret",
        coordinatePath: expect.objectContaining({
          documentPoint: { x: 20, y: 20 }
        })
      })
    }));
  });

  it("maps viewport blank space to the nearest editable layout node", () => {
    const result = hitTestQuirePointerNearestCaret({
      snapshot,
      clientPoint: { clientX: 300, clientY: 320 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "position",
      position: { pos: 5, bias: -1 },
      inside: 0,
      rect: { x: 40, y: 44, width: 300, height: 24 }
    }));
    expect(result.diagnostics?.migrationFallbacks).toBeUndefined();
  });

  it("maps blank clicks on an empty textblock to its editable content position", () => {
    const emptySnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        range: { from: 0, to: 2 },
        children: [
          {
            id: "paragraph-0",
            kind: "block",
            range: { from: 0, to: 2 },
            rect: { x: 40, y: 44, width: 300, height: 24 },
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      hitTestQuirePointerNearestCaret({
        snapshot: emptySnapshot,
        clientPoint: { clientX: 300, clientY: 320 },
        canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
      })
    ).toEqual(expect.objectContaining({
      kind: "position",
      position: { pos: 1, bias: 0 },
      inside: 0,
      rect: { x: 40, y: 44, width: 300, height: 24 }
    }));
  });

  it("reports retained pass-through decisions before fallback text hits", () => {
    const passThroughSnapshot = {
      ...snapshot,
      hitTargets: [
        {
          id: "selection-overlay",
          range: { from: 0, to: 5 },
          rect: { x: 40, y: 44, width: 300, height: 24 },
          layer: { plane: "selection" },
          pointerPolicy: { kind: "pass-through" }
        }
      ]
    } satisfies QuireLayoutSnapshot;

    const result = hitTestQuirePointerNearestCaret({
      snapshot: passThroughSnapshot,
      clientPoint: { clientX: 180, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "position",
      position: { pos: 0, bias: 1 }
    }));
    expect(result.diagnostics?.targetChain).toEqual([
      expect.objectContaining({
        targetId: "selection-overlay",
        decision: "pass-through"
      })
    ]);
    expect(result.diagnostics?.passThroughDecisions).toEqual([
      expect.objectContaining({
        targetId: "selection-overlay",
        decision: "pass-through"
      })
    ]);
  });

  it("reports retained root and region facts for layer target hits", () => {
    const rootRegionSnapshot = {
      ...snapshot,
      hitTargets: [
        {
          id: "body-widget",
          range: { from: 0, to: 5 },
          rect: { x: 40, y: 44, width: 300, height: 24 },
          viewRegion: bodyRegion,
          interactionHit: {
            kind: "control",
            region: bodyRegion,
            controlId: "body-widget"
          },
          layer: { plane: "content" },
          pointerPolicy: { kind: "select" }
        }
      ]
    } satisfies QuireLayoutSnapshot;

    const result = hitTestQuirePointerNearestCaret({
      snapshot: rootRegionSnapshot,
      clientPoint: { clientX: 180, clientY: 254 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    });

    expect(result.diagnostics?.rootRegion).toEqual({
      root: { value: "root:body" },
      region: expect.objectContaining({
        regionId: { value: "region:body" },
        kind: "body"
      })
    });
    expect(result.diagnostics?.layerHitChain).toEqual([
      expect.objectContaining({ targetId: "body-widget" })
    ]);
  });

  it("clamps document blank space through the canonical nearest-caret path", () => {
    const documentBlankSnapshot = {
      ...snapshot,
      documentRect: { x: 40, y: 44, width: 300, height: 80 },
      root: {
        ...snapshot.root,
        range: { from: 0, to: 2 },
        rect: { x: 40, y: 44, width: 300, height: 80 },
        children: [
          {
            id: "paragraph-0",
            kind: "block",
            range: { from: 0, to: 2 },
            rect: { x: 40, y: 44, width: 300, height: 24 },
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;
    const options = {
      snapshot: documentBlankSnapshot,
      clientPoint: { clientX: 300, clientY: 300 },
      canvasClientRect: { left: 100, top: 200, width: 840, height: 360 }
    };

    expect(hitTestQuirePointerNearestCaret(options)).toEqual(expect.objectContaining({
      kind: "position",
      position: { pos: 1, bias: 0 },
      inside: 0,
      rect: { x: 40, y: 44, width: 300, height: 24 }
    }));
    expect(hitTestQuirePointerNearestCaret(options).diagnostics).toEqual(
      expect.objectContaining({
        querySource: "retained-nearest-caret"
      })
    );
  });

  it("preserves row-offset grid slots through nearest-caret pointer hits", () => {
    const tableSnapshot = {
      ...snapshot,
      documentRect: { x: 0, y: 0, width: 400, height: 140 },
      viewportRect: { x: 0, y: 0, width: 400, height: 140 },
      root: {
        ...snapshot.root,
        range: { from: 0, to: 24 },
        rect: { x: 0, y: 0, width: 400, height: 140 },
        children: [
          {
            id: "table-layout",
            kind: "block",
            range: { from: 0, to: 24 },
            rect: { x: 10, y: 20, width: 300, height: 84 },
            table: createPointerTableLayoutSnapshot(),
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    const result = hitTestQuirePointerNearestCaret({
      snapshot: tableSnapshot,
      clientPoint: { clientX: 40, clientY: 58 },
      canvasClientRect: { left: 0, top: 0, width: 400, height: 140 }
    });

    expect(result).toEqual(expect.objectContaining({
      kind: "position",
      position: { pos: 5, bias: 1 },
      inside: 4,
      rect: { x: 110, y: 48, width: 100, height: 28 },
      tableRowOffsetSlot: {
        kind: "table-row-offset-slot",
        tableId: "wordTable-0",
        tableRange: { from: 0, to: 24 },
        rowIndex: 1,
        columnIndex: 0,
        sourceKind: "row-offset",
        side: "before",
        rect: { x: 10, y: 48, width: 100, height: 28 }
      }
    }));
    expect(result.diagnostics).toEqual(expect.objectContaining({
      querySource: "retained-nearest-caret"
    }));
  });

  it("preserves structural table-cell facts through nearest-caret pointer hits", () => {
    const cellTarget = {
      id: "wordTable-0:hit:semantic:r0:c0:g0:1",
      kind: "cell" as const,
      tableId: "wordTable-0",
      semanticCellId: "semantic:r0:c0:g0:1",
      originExplicitCellId: "cell:r0:c0:g0:1",
      explicitCellIds: ["cell:r0:c0:g0:1"],
      originCellPos: 2,
      range: { from: 2, to: 6 },
      rect: { x: 10, y: 20, width: 150, height: 28 }
    };
    const tableSnapshot = {
      ...snapshot,
      documentRect: { x: 0, y: 0, width: 400, height: 140 },
      viewportRect: { x: 0, y: 0, width: 400, height: 140 },
      hitTargets: [cellTarget],
      root: {
        ...snapshot.root,
        range: { from: 0, to: 20 },
        rect: { x: 0, y: 0, width: 400, height: 140 },
        children: [{
          id: "table-layout",
          kind: "block" as const,
          range: { from: 0, to: 20 },
          rect: { x: 10, y: 20, width: 300, height: 56 },
          children: []
        }]
      }
    } satisfies QuireLayoutSnapshot;

    expect(hitTestQuirePointerNearestCaret({
      snapshot: tableSnapshot,
      clientPoint: { clientX: 20, clientY: 30 },
      canvasClientRect: { left: 0, top: 0, width: 400, height: 140 }
    })).toEqual(expect.objectContaining({
      kind: "position",
      tableCell: {
        tableId: "wordTable-0",
        tablePos: 0,
        semanticCellId: "semantic:r0:c0:g0:1",
        originCellPos: 2,
        range: { from: 2, to: 6 },
        rect: { x: 10, y: 20, width: 150, height: 28 }
      }
    }));
  });

  it("normalizes double and triple clicks when browser detail is unavailable", () => {
    const tracker = createQuirePointerClickTracker({
      intervalMs: 500,
      distancePx: 6
    });

    expect(tracker.resolveClickCount({ clientX: 10, clientY: 10, timeStamp: 100 })).toBe(1);
    expect(tracker.resolveClickCount({ clientX: 12, clientY: 10, timeStamp: 240 })).toBe(2);
    expect(tracker.resolveClickCount({ clientX: 13, clientY: 11, timeStamp: 360 })).toBe(3);
    expect(tracker.resolveClickCount({ clientX: 14, clientY: 11, timeStamp: 420 })).toBe(3);
  });

  it("starts a new click series after timeout or excessive movement", () => {
    const tracker = createQuirePointerClickTracker({
      intervalMs: 100,
      distancePx: 4
    });

    expect(tracker.resolveClickCount({ clientX: 10, clientY: 10, timeStamp: 100 })).toBe(1);
    expect(tracker.resolveClickCount({ clientX: 10, clientY: 10, timeStamp: 250 })).toBe(1);
    expect(tracker.resolveClickCount({ clientX: 20, clientY: 10, timeStamp: 300 })).toBe(1);
  });

  it("trusts browser-provided click detail when available", () => {
    const tracker = createQuirePointerClickTracker();

    expect(
      tracker.resolveClickCount({
        clientX: 10,
        clientY: 10,
        detail: 2,
        timeStamp: 100
      })
    ).toBe(2);
    expect(tracker.snapshot()?.count).toBe(2);
  });

  it("measures distance between client points", () => {
    expect(
      measureQuireClientPointDistance(
        { clientX: 10, clientY: 10 },
        { clientX: 13, clientY: 14 }
      )
    ).toBe(5);
  });
});

/**
 * Creates table metadata with a row-offset grid slot.
 *
 * @returns Table layout snapshot used by pointer hit-test fixtures.
 */
function createPointerTableLayoutSnapshot(): QuireTableLayoutSnapshot {
  return {
    tableId: "wordTable-0",
    fragmentId: "wordTable-0",
    geometryId: "wordTable-0",
    tableRange: { from: 0, to: 24 },
    style: {
      backgroundColor: null,
      borderColor: "#cbd5e1",
      borderWidth: 1
    },
    borders: null,
    rect: { x: 10, y: 20, width: 300, height: 84 },
    tracks: [
      { id: "column-0", columnIndex: 0, x: 10, width: 100 },
      { id: "column-1", columnIndex: 1, x: 110, width: 100 },
      { id: "column-2", columnIndex: 2, x: 210, width: 100 }
    ],
    rows: [
      {
        id: "row-1",
        sourceRowId: "row:r1",
        rowIndex: 1,
        isHeader: false,
        cantSplit: false,
        gridBefore: { side: "before", startColumn: 0, columnSpan: 1 },
        gridAfter: { side: "after", startColumn: 2, columnSpan: 1 },
        range: { from: 4, to: 8 },
        rect: { x: 10, y: 48, width: 300, height: 28 }
      }
    ],
    cells: [
      createPointerTableCellFragment({
        id: "cell-r1-c1",
        range: { from: 4, to: 8 },
        gridRect: {
          startRow: 1,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        },
        rect: { x: 110, y: 48, width: 100, height: 28 },
        contentRect: { x: 115, y: 53, width: 90, height: 18 }
      })
    ],
    hitTargets: []
  };
}

/**
 * Creates one table cell fragment for pointer row-offset fixtures.
 *
 * @param options - Cell identity, source range, grid rectangle, and geometry.
 * @returns Table cell fragment with neutral style metadata.
 */
function createPointerTableCellFragment(options: {
  /** Stable cell fragment id. */
  readonly id: string;
  /** Editable document range represented by the cell. */
  readonly range: QuireTableCellFragment["range"];
  /** Source grid rectangle occupied by the cell. */
  readonly gridRect: QuireTableCellFragment["gridRect"];
  /** Full cell rectangle in document coordinates. */
  readonly rect: QuireTableCellFragment["rect"];
  /** Content rectangle inside the cell. */
  readonly contentRect: QuireTableCellFragment["contentRect"];
}): QuireTableCellFragment {
  return {
    id: options.id,
    semanticCellId: `semantic:${options.id}`,
    originExplicitCellId: `explicit:${options.id}`,
    explicitCellIds: [`explicit:${options.id}`],
    originCellPos: options.range.from,
    range: options.range,
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect: options.gridRect,
    rect: options.rect,
    contentRect: options.contentRect,
    contentChildren: []
  };
}
