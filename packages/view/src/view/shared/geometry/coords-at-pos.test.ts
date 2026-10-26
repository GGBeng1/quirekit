import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { resolveQuireViewCoordsAtPos } from "./coords-at-pos";
import { resolveQuireViewPosAtCoords } from "./pos-at-coords";

describe("shared view coordsAtPos geometry", () => {
  it("passes active selection context to repeated sub-layout caret resolution", () => {
    const lowerOwner = createCoordsAtPosQueryOwner("cell#p5");
    const snapshot = createRepeatedCaretSnapshot(
      createCoordsAtPosQueryOwner("cell#p3"),
      lowerOwner
    );

    expect(
      resolveQuireViewCoordsAtPos({
        geometrySnapshot: snapshot,
        pos: 5720,
        side: 1,
        selectionContext: {
          queryOwner: lowerOwner,
          referenceRect: { x: 173, y: 160, width: 1, height: 24 }
        },
        surfaceClientRect: { left: 0, top: 0, width: 800, height: 800 }
      })
    ).toEqual({
      left: 173,
      right: 174,
      top: 160,
      bottom: 184
    });
  });

  it("round-trips ordinary repeated text with the context returned by posAtCoords", () => {
    const snapshot = createRepeatedOrdinaryTextSnapshot();
    const hit = resolveQuireViewPosAtCoords({
      geometrySnapshot: snapshot,
      coords: { left: 25, top: 125 },
      surfaceClientRect: { left: 0, top: 0, width: 200, height: 200 }
    });

    expect(hit).toMatchObject({
      pos: 11,
      selectionContext: {
        queryOwner: {
          sourceRootId: "word-story:footer-default",
          sourceFragmentId: "page:1:word-story:footer-default",
          region: {
            kind: "footer",
            visualInstanceId: "page:1:word-story:footer-default"
          }
        },
        ownerSource: { sourceId: "word-story:footer-default" }
      }
    });
    if (hit === null) {
      throw new Error("Expected repeated ordinary text hit.");
    }

    expect(resolveQuireViewCoordsAtPos({
      geometrySnapshot: snapshot,
      pos: hit.pos,
      side: 1,
      selectionContext: hit.selectionContext,
      surfaceClientRect: { left: 0, top: 0, width: 200, height: 200 }
    })).toEqual({
      left: 20,
      right: 21,
      top: 120,
      bottom: 144
    });
  });
});

/**
 * Creates two ordinary text occurrences backed by one persisted footer range.
 *
 * @returns Layout snapshot with page-local retained ownership on both occurrences.
 */
function createRepeatedOrdinaryTextSnapshot(): QuireLayoutSnapshot {
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 200, height: 200 },
    viewportRect: { x: 0, y: 0, width: 200, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 30 },
      rect: { x: 0, y: 0, width: 200, height: 200 },
      children: [
        createRepeatedOrdinaryTextNode(20, 40, 0),
        createRepeatedOrdinaryTextNode(20, 120, 1)
      ]
    }
  };
}

/**
 * Creates one page-local occurrence of an ordinary footer text node.
 *
 * @param x - Document-space horizontal origin.
 * @param y - Document-space vertical origin.
 * @param pageIndex - Physical page index used by retained identity.
 * @returns Owned ordinary layout text node.
 */
function createRepeatedOrdinaryTextNode(
  x: number,
  y: number,
  pageIndex: number
): NonNullable<QuireLayoutSnapshot["root"]["children"]>[number] {
  const visualInstanceId = `page:${pageIndex}:word-story:footer-default`;
  const region = {
    rootId: { value: "root:word-story:footer-default" },
    regionId: { value: "region:word-story:footer-default" },
    kind: "footer" as const,
    visualInstanceId
  };

  return {
    id: `footer:${pageIndex}`,
    kind: "block",
    range: { from: 10, to: 17 },
    rect: { x, y, width: 60, height: 24 },
    viewRegion: region,
    layoutOwner: {
      region,
      source: {
        sourceId: "word-story:footer-default",
        range: { from: 10, to: 17 }
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    },
    textFragments: [{
      id: `footer:${pageIndex}:text`,
      text: "Footer",
      range: { from: 11, to: 17 },
      rect: { x, y, width: 60, height: 24 },
      font: "16px sans-serif",
      lineHeight: 24,
      baseline: y + 18,
      caretStops: [
        { position: { pos: 11, bias: 1 }, localX: 0 },
        { position: { pos: 12, bias: 0 }, localX: 10 },
        { position: { pos: 13, bias: 0 }, localX: 20 },
        { position: { pos: 14, bias: 0 }, localX: 30 },
        { position: { pos: 15, bias: 0 }, localX: 40 },
        { position: { pos: 16, bias: 0 }, localX: 50 },
        { position: { pos: 17, bias: -1 }, localX: 60 }
      ]
    }],
    children: []
  };
}

/**
 * Creates a layout snapshot with two repeated retained sub-layout caret stops.
 *
 * @param upperOwner - Query owner for the upper visual instance.
 * @param lowerOwner - Query owner for the lower visual instance.
 * @returns Layout snapshot fixture for shared coordsAtPos tests.
 */
function createRepeatedCaretSnapshot(
  upperOwner: QuireLayoutQueryProductOwner,
  lowerOwner: QuireLayoutQueryProductOwner
): QuireLayoutSnapshot {
  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 800, height: 800 },
    viewportRect: { x: 0, y: 0, width: 800, height: 800 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 4413, to: 7041 },
      rect: { x: 0, y: 0, width: 800, height: 800 },
      children: [
        createRepeatedSubLayoutCaretNode("wordTable-69:layout#p3", 60, upperOwner),
        createRepeatedSubLayoutCaretNode("wordTable-69:layout#p5", 160, lowerOwner)
      ]
    }
  };
}

/**
 * Creates a repeated sub-layout node with one retained caret stop.
 *
 * @param id - Stable layout node id for the visual fragment.
 * @param y - Document-space y coordinate of the caret stop.
 * @param queryOwner - Query-product owner carried by the caret stop.
 * @returns Layout node fixture with one retained sub-layout caret stop.
 */
function createRepeatedSubLayoutCaretNode(
  id: string,
  y: number,
  queryOwner: QuireLayoutQueryProductOwner
): NonNullable<QuireLayoutSnapshot["root"]["children"]>[number] {
  return {
    id,
    kind: "block",
    range: { from: 7159, to: 7186 },
    rect: { x: 168, y, width: 553, height: 101 },
    subLayoutQueryProducts: {
      selectionRects: [],
      caretStops: [
        {
          textFragmentId: "caret-line-y",
          position: { pos: 5720, bias: 1 },
          rect: { x: 173, y, width: 1, height: 24 },
          queryOwner
        }
      ],
      hitTargets: [],
      inputAnchors: []
    },
    children: []
  };
}

/**
 * Creates query-owner identity for coordsAtPos fixtures.
 *
 * @param visualInstanceId - Visual instance represented by the query owner.
 * @returns Query-product owner identity.
 */
function createCoordsAtPosQueryOwner(
  visualInstanceId: string
): QuireLayoutQueryProductOwner {
  return {
    sourceRootId: "table-cell:semantic:r0:c0:g0:1",
    sourceFragmentId: `${visualInstanceId}:line`,
    coordinateSpace: "document",
    sourceCoordinateSpace: "table-cell-local",
    region: {
      rootId: { value: "root:table-cell:semantic:r0:c0:g0:1" },
      regionId: { value: "region:table-cell:semantic:r0:c0:g0:1" },
      kind: "table-cell",
      visualInstanceId
    }
  };
}
