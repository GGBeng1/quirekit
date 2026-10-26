import type {
  QuireLayoutNode,
  QuireLayoutSnapshot,
  QuireTableLayoutSnapshot,
  QuireViewInteractionHit
} from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { resolveEditorUIAnchorGeometry } from ".";

const region = {
  rootId: { value: "body-root" },
  regionId: { value: "body-region" },
  kind: "body" as const
};

const snapshot = createAnchorSnapshot();

describe("Editor UI anchor geometry", () => {
  it("resolves caret and text anchors from one retained snapshot", () => {
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "caret",
        position: 2,
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "caret",
      coordinateSpace: "document",
      snapshotVersion: 7,
      position: 2,
      referenceRect: { x: 20, y: 20, width: 1, height: 24 }
    });

    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "text",
        range: { from: 1, to: 3 },
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "ready",
      kind: "text",
      coordinateSpace: "document",
      snapshotVersion: 7,
      range: { from: 1, to: 3 },
      rects: [{ x: 10, y: 20, width: 20, height: 24 }],
      referenceRect: { x: 10, y: 20, width: 20, height: 24 },
      sourceTargetIds: []
    });
  });

  it("resolves node, object, and widget anchors only from semantic hit targets", () => {
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "object",
        objectId: "picture-single",
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "object",
      objectId: "picture-single",
      rects: [{ x: 120, y: 52, width: 96, height: 72 }],
      sourceTargetIds: ["object:picture-single"]
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "node",
        nodeId: "paragraph-node",
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "node",
      nodeId: "paragraph-node",
      rects: [{ x: 8, y: 16, width: 306, height: 32 }],
      sourceTargetIds: ["node:paragraph-node"]
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "object",
        objectId: "picture-missing",
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "object",
      snapshotVersion: 7,
      reason: "object-target-unavailable"
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "widget",
        widgetId: "comment-button",
        part: "trigger",
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "widget",
      widgetId: "comment-button",
      part: "trigger",
      rects: [{ x: 300, y: 20, width: 24, height: 24 }],
      sourceTargetIds: ["widget:comment-button"]
    });
  });

  it("requires an exact occurrence when one object has repeated retained targets", () => {
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "object",
        objectId: "picture-repeated",
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "object",
      snapshotVersion: 7,
      reason: "object-target-ambiguous"
    });

    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "object",
        objectId: "picture-repeated",
        occurrence: { visualInstanceId: "page:1" },
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "object",
      objectId: "picture-repeated",
      rects: [{ x: 120, y: 252, width: 96, height: 72 }],
      sourceTargetIds: ["object:picture-repeated:page:1"]
    });

    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "object",
        objectId: "picture-repeated",
        occurrence: { targetId: "object:picture-repeated:page:0" },
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "object",
      objectId: "picture-repeated",
      sourceTargetIds: ["object:picture-repeated:page:0"]
    });

    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "object",
        objectId: "picture-repeated",
        occurrence: { targetId: "object:missing" },
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "object",
      snapshotVersion: 7,
      reason: "occurrence-target-unavailable"
    });
  });

  it("resolves table cells and chrome without selection or caret fallbacks", () => {
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "table",
        tableId: "table:4",
        tablePos: 4,
        activePosition: 6,
        target: { kind: "cell", cellId: "merged" },
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "table",
      tableId: "table:4",
      target: { kind: "cell", cellId: "merged" },
      rects: [{ x: 80, y: 100, width: 120, height: 80 }],
      sourceTargetIds: ["table:4:merged"]
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "table",
        tableId: "table:4",
        tablePos: 4,
        activePosition: 6,
        target: { kind: "column", index: 1 },
        expectedSnapshotVersion: 7
      }
    })).toMatchObject({
      status: "ready",
      kind: "table",
      target: { kind: "column", index: 1 },
      rects: [{ x: 200, y: 100, width: 120, height: 80 }]
    });
  });

  it("accepts an explicit document-space virtual rect without DOM discovery", () => {
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "virtual",
        rect: { x: 42, y: 66, width: 18, height: 12 },
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "ready",
      kind: "virtual",
      coordinateSpace: "document",
      snapshotVersion: 7,
      rects: [{ x: 42, y: 66, width: 18, height: 12 }],
      referenceRect: { x: 42, y: 66, width: 18, height: 12 },
      sourceTargetIds: []
    });
  });

  it("reports stale and unsupported outcomes instead of guessing", () => {
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "node",
        nodeId: "missing-node",
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "node",
      snapshotVersion: 7,
      reason: "node-target-unavailable"
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "widget",
        widgetId: "comment-button",
        expectedSnapshotVersion: 6
      }
    })).toEqual({
      status: "stale",
      kind: "widget",
      expectedSnapshotVersion: 6,
      snapshotVersion: 7
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot: { ...snapshot, viewGraph: undefined },
      request: {
        kind: "table",
        tableId: "table:4",
        tablePos: 4,
        activePosition: 6,
        target: { kind: "table" },
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "table",
      reason: "snapshot-version-unavailable"
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "virtual",
        rect: { x: Number.NaN, y: 0, width: 1, height: 1 },
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "virtual",
      snapshotVersion: 7,
      reason: "virtual-rect-invalid"
    });
    expect(resolveEditorUIAnchorGeometry({
      snapshot,
      request: {
        kind: "caret",
        position: 2,
        occurrence: { targetId: "missing-occurrence" },
        expectedSnapshotVersion: 7
      }
    })).toEqual({
      status: "unsupported",
      kind: "caret",
      snapshotVersion: 7,
      reason: "occurrence-target-unavailable"
    });
  });
});

/**
 * Creates the retained snapshot used by headless anchor-resolution tests.
 *
 * @returns Snapshot with text, node, widget, and Table products.
 */
function createAnchorSnapshot(): QuireLayoutSnapshot {
  const nodeHit = {
    kind: "node",
    nodeId: "paragraph-node",
    pos: 0,
    region
  } satisfies QuireViewInteractionHit;
  const widgetHit = {
    kind: "widget",
    widgetId: "comment-button",
    part: "trigger",
    region
  } satisfies QuireViewInteractionHit;
  const table = createTableSnapshot();

  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 400, height: 240 },
    viewportRect: { x: 0, y: 0, width: 400, height: 240 },
    domOverlays: [],
    viewGraph: { version: 7 } as QuireLayoutSnapshot["viewGraph"],
    hitTargets: [
      {
        id: "node:paragraph-node",
        range: { from: 0, to: 5 },
        rect: { x: 8, y: 16, width: 306, height: 32 },
        interactionHit: nodeHit
      },
      {
        id: "widget:comment-button",
        range: { from: 1, to: 4 },
        rect: { x: 300, y: 20, width: 24, height: 24 },
        interactionHit: widgetHit
      },
      createObjectTarget(
        "object:picture-single",
        "picture-single",
        { x: 120, y: 52, width: 96, height: 72 }
      ),
      createObjectTarget(
        "object:picture-repeated:page:0",
        "picture-repeated",
        { x: 120, y: 152, width: 96, height: 72 },
        "page:0"
      ),
      createObjectTarget(
        "object:picture-repeated:page:1",
        "picture-repeated",
        { x: 120, y: 252, width: 96, height: 72 },
        "page:1"
      ),
      {
        id: "table:4:merged",
        kind: "cell",
        tableId: "table:4",
        semanticCellId: "merged",
        originExplicitCellId: "merged:origin",
        explicitCellIds: ["merged:origin"],
        originCellPos: 5,
        range: { from: 5, to: 20 },
        rect: { x: 80, y: 100, width: 120, height: 80 }
      }
    ],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 30 },
      rect: { x: 0, y: 0, width: 400, height: 240 },
      children: [
        {
          id: "paragraph",
          kind: "block",
          range: { from: 0, to: 5 },
          rect: { x: 10, y: 20, width: 300, height: 24 },
          textFragments: [{
            id: "paragraph:text",
            text: "One",
            range: { from: 1, to: 4 },
            rect: { x: 10, y: 20, width: 30, height: 24 },
            font: "16px sans-serif",
            lineHeight: 24,
            baseline: 38,
            caretStops: [
              { position: { pos: 1, bias: 1 }, localX: 0 },
              { position: { pos: 2, bias: 0 }, localX: 10 },
              { position: { pos: 3, bias: 0 }, localX: 20 },
              { position: { pos: 4, bias: -1 }, localX: 30 }
            ]
          }],
          children: []
        },
        createTableNode(table)
      ]
    }
  } as QuireLayoutSnapshot;
}

/**
 * Creates one retained object-body target with optional repeated identity.
 *
 * @param id - Snapshot-unique retained target id.
 * @param objectId - Stable semantic object id.
 * @param rect - Document-space object bounds.
 * @param visualInstanceId - Optional repeated visual occurrence id.
 * @returns Canonical object interaction target.
 */
function createObjectTarget(
  id: string,
  objectId: string,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  visualInstanceId?: string
): QuireLayoutSnapshot["hitTargets"][number] {
  const objectRegion = {
    ...region,
    regionId: { value: `region:${objectId}` },
    kind: "floating-object" as const,
    ...(visualInstanceId === undefined ? {} : { visualInstanceId })
  };
  return {
    id,
    range: { from: 1, to: 2 },
    rect,
    viewRegion: objectRegion,
    interactionHit: {
      kind: "object",
      objectId,
      region: objectRegion
    }
  };
}

/**
 * Creates one retained Table node.
 *
 * @param table - Table layout snapshot owned by the node.
 * @returns Retained layout node containing Table geometry.
 */
function createTableNode(table: QuireTableLayoutSnapshot): QuireLayoutNode {
  return {
    id: "table-node",
    kind: "block",
    range: table.tableRange,
    rect: table.rect,
    table
  };
}

/**
 * Creates a two-column Table snapshot for anchor chrome tests.
 *
 * @returns Minimal retained Table geometry.
 */
function createTableSnapshot(): QuireTableLayoutSnapshot {
  const cells = [
    createCell("left", "merged", 0, 80),
    createCell("right", "right", 1, 200)
  ];

  return {
    tableId: "table:4",
    geometryId: "geometry:page-1",
    fragmentId: "page-1",
    tableRange: { from: 4, to: 21 },
    style: {} as QuireTableLayoutSnapshot["style"],
    borders: null,
    rect: { x: 80, y: 100, width: 240, height: 80 },
    tracks: [
      { id: "column:0", columnIndex: 0, x: 80, width: 120 },
      { id: "column:1", columnIndex: 1, x: 200, width: 120 }
    ],
    rows: [{
      id: "row:0",
      sourceRowId: "row:0",
      rowIndex: 0,
      isHeader: false,
      cantSplit: false,
      range: { from: 5, to: 20 },
      rect: { x: 80, y: 100, width: 240, height: 80 }
    }],
    cells,
    hitTargets: []
  };
}

/**
 * Creates one retained Table cell fragment.
 *
 * @param id - Fragment-local cell id.
 * @param semanticCellId - Stable semantic cell id.
 * @param columnIndex - Zero-based grid column.
 * @param x - Document-space horizontal origin.
 * @returns Table cell geometry.
 */
function createCell(
  id: string,
  semanticCellId: string,
  columnIndex: number,
  x: number
): QuireTableLayoutSnapshot["cells"][number] {
  return {
    id,
    semanticCellId,
    originExplicitCellId: `${semanticCellId}:origin`,
    explicitCellIds: [`${semanticCellId}:origin`],
    originCellPos: 5,
    range: { from: 5, to: 20 },
    shading: null,
    borders: null,
    cellMargins: null,
    gridRect: { startRow: 0, rowSpan: 1, startColumn: columnIndex, columnSpan: 1 },
    rect: { x, y: 100, width: 120, height: 80 },
    contentRect: { x, y: 100, width: 120, height: 80 },
    contentChildren: []
  };
}
