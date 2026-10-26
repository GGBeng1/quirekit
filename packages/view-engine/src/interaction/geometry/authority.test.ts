import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "../../view-graph";
import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type {
  QuireViewGraphPerformanceContract,
  QuireViewInteractionHit,
  QuireViewLayerRef,
  QuireViewPointerPolicy,
  QuireViewGraphSnapshot
} from "../../view-graph";
import { describe, expect, it } from "vitest";
import {
  createQuireInteractionGeometryAuthority,
  resolveQuireInteractionCaretAtPosition,
  resolveQuireInteractionHitTargetAtPoint,
  resolveQuireInteractionInputAnchor,
  resolveQuireInteractionNearestCaretAtPoint,
  resolveQuireInteractionPositionAtPoint,
  resolveQuireInteractionRectAtPosition,
  resolveQuireInteractionSelectionRects
} from ".";

const performance = {
  invariants: quireViewGraphRequiredPerformanceInvariants,
  invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map((kind) => ({
    kind
  })),
  queryBudget: { kind: "viewport-indexed" }
} satisfies QuireViewGraphPerformanceContract;

const viewGraph = {
  version: 7,
  performance,
  roots: [],
  regions: []
} satisfies QuireViewGraphSnapshot;

const textRegion = {
  rootId: { value: "body-root" },
  regionId: { value: "table-cell-region" },
  kind: "table-cell"
} satisfies QuireLayoutRegionRef;

const textInteractionHit = {
  kind: "text",
  region: textRegion,
  anchor: {
    rootId: textRegion.rootId,
    regionId: textRegion.regionId,
    position: { pos: 2, bias: 0 },
    affinity: "after"
  }
} satisfies QuireViewInteractionHit;

const snapshot = {
  state: {} as QuireLayoutSnapshot["state"],
  documentRect: { x: 10, y: 20, width: 300, height: 48 },
  viewportRect: { x: 10, y: 20, width: 300, height: 200 },
  domOverlays: [],
  hitTargets: [],
  viewGraph,
  root: {
    id: "doc",
    kind: "block",
    range: { from: 0, to: 5 },
    rect: { x: 10, y: 20, width: 300, height: 48 },
    children: [
      {
        id: "paragraph-0",
        kind: "block",
        range: { from: 0, to: 5 },
        rect: { x: 10, y: 20, width: 300, height: 24 },
        textFragments: [
          {
            id: "paragraph-0:text-0",
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
          }
        ],
        children: []
      }
    ]
  }
} satisfies QuireLayoutSnapshot;

describe("interaction geometry authority", () => {
  it("exposes the snapshot-backed architecture query surface", () => {
    const authority = createQuireInteractionGeometryAuthority({ snapshot });

    expect(authority.hitTargetAt({ x: 26, y: 30 })).toEqual({
      kind: "hit",
      targetKind: "position",
      source: "retained-hit-target",
      snapshotVersion: 7,
      position: { pos: 3, bias: 0 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
    expect(authority.posAtCoords({ x: 26, y: 30 })).toEqual({
      kind: "position",
      source: "retained-position",
      snapshotVersion: 7,
      position: { pos: 3, bias: 0 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
    expect(authority.nearestCaret({ x: 130, y: 50 })).toEqual({
      kind: "caret",
      source: "retained-nearest-caret",
      snapshotVersion: 7,
      position: { pos: 4, bias: -1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
    expect(authority.coordsAtPos(2, 1)).toEqual({
      source: "layout-rect",
      snapshotVersion: 7,
      rect: { x: 20, y: 20, width: 1, height: 24 }
    });
    expect(authority.caretAtPosition(2, 1)).toEqual({
      source: "layout-caret",
      snapshotVersion: 7,
      position: { pos: 2, bias: 0 },
      rect: { x: 20, y: 20, width: 1, height: 24 }
    });
    expect(authority.selectionRects({ from: 1, to: 3 })).toEqual({
      source: "layout-selection-rects",
      snapshotVersion: 7,
      ranges: [
        {
          range: { from: 1, to: 3 },
          rect: { x: 10, y: 20, width: 20, height: 24 }
        }
      ]
    });
    expect(authority.inputAnchor(2, "caret")).toBeNull();
  });

  it("resolves hit targets before position mapping", () => {
    expect(
      resolveQuireInteractionHitTargetAtPoint({
        snapshot,
        point: { x: 26, y: 30 }
      })
    ).toEqual({
      kind: "hit",
      targetKind: "position",
      source: "retained-hit-target",
      snapshotVersion: 7,
      position: { pos: 3, bias: 0 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("preserves retained interaction-hit targets", () => {
    expect(
      resolveQuireInteractionHitTargetAtPoint({
        snapshot: {
          ...snapshot,
          root: {
            ...snapshot.root,
            children: [
              {
                id: "retained-cell",
                kind: "block",
                interactionRole: "source-geometry",
                range: { from: 1, to: 4 },
                rect: { x: 60, y: 30, width: 80, height: 28 },
                subLayoutQueryProducts: {
                  selectionRects: [{
                    textFragmentId: "caret-line-30",
                    range: { from: 1, to: 4 },
                    rect: { x: 60, y: 30, width: 80, height: 28 }
                  }],
                  caretStops: [
                    {
                      textFragmentId: "caret-line-30",
                      position: { pos: 2, bias: 0 },
                      rect: { x: 72, y: 30, width: 1, height: 24 }
                    }
                  ],
                  hitTargets: [
                    {
                      id: "retained-cell:text",
                      range: { from: 1, to: 4 },
                      rect: { x: 60, y: 30, width: 80, height: 28 },
                      viewRegion: textRegion,
                      interactionHit: textInteractionHit
                    }
                  ],
                  inputAnchors: []
                },
                children: []
              }
            ]
          }
        },
        point: { x: 74, y: 40 }
      })
    ).toEqual({
      kind: "hit",
      targetKind: "interaction-hit",
      source: "retained-hit-target",
      snapshotVersion: 7,
      position: { pos: 2, bias: 0 },
      inside: 1,
      rect: { x: 60, y: 30, width: 80, height: 28 },
      viewRegion: textRegion,
      interactionHit: textInteractionHit
    });
  });

  it("preserves retained layer diagnostics through the hit-target facade", () => {
    const controlLayer = {
      plane: "controls",
      zIndex: 20,
      priority: 5
    } satisfies QuireViewLayerRef;
    const controlPolicy = {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    } satisfies QuireViewPointerPolicy;
    const controlRegion = {
      rootId: { value: "body-root" },
      regionId: { value: "paragraph-handle:region" },
      kind: "control"
    } satisfies QuireLayoutRegionRef;
    const controlHit = {
      kind: "control",
      region: controlRegion,
      controlId: "paragraph-handle",
      layer: controlLayer,
      pointerPolicy: controlPolicy
    } satisfies QuireViewInteractionHit;

    expect(
      resolveQuireInteractionHitTargetAtPoint({
        snapshot: {
          ...snapshot,
          hitTargets: [
            {
              id: "paragraph-handle",
              range: { from: 1, to: 4 },
              rect: { x: 20, y: 20, width: 18, height: 24 },
              layer: controlLayer,
              pointerPolicy: controlPolicy,
              interactionHit: controlHit
            }
          ]
        },
        point: { x: 26, y: 30 }
      })
    ).toEqual({
      kind: "hit",
      targetKind: "interaction-hit",
      source: "retained-hit-target",
      snapshotVersion: 7,
      position: { pos: 3, bias: 0 },
      inside: 1,
      rect: { x: 20, y: 20, width: 18, height: 24 },
      viewRegion: controlRegion,
      interactionHit: controlHit,
      layer: controlLayer,
      pointerPolicy: controlPolicy,
      layerHitChain: [
        expect.objectContaining({
          targetId: "paragraph-handle",
          layer: controlLayer,
          pointerPolicy: controlPolicy
        })
      ],
      layerTargetIndexQuery: {
        targetIds: ["paragraph-handle"],
        buckets: [],
        unbucketedTargetIds: ["paragraph-handle"],
        source: "unindexed-layer-target-scan"
      },
      targetChain: [
        expect.objectContaining({
          targetId: "paragraph-handle",
          decision: "target-dispatch"
        })
      ]
    });
  });

  it("rejects retained layer targets that only match transformed coarse bounds", () => {
    const layer = { plane: "drawing", zIndex: 4 } satisfies QuireViewLayerRef;
    const policy = {
      kind: "select",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    } satisfies QuireViewPointerPolicy;
    const region = {
      rootId: { value: "picture-root" },
      regionId: { value: "picture-region" },
      kind: "floating-object"
    } satisfies QuireLayoutRegionRef;
    const objectHit = {
      kind: "object",
      objectId: "rotated-picture",
      region,
      layer,
      pointerPolicy: policy
    } satisfies QuireViewInteractionHit;
    const interactionScope = {
      region: {
        rootId: { value: "header-root" },
        regionId: { value: "header-region" },
        kind: "header" as const,
        visualInstanceId: "page:0:header"
      },
      source: {
        sourceId: "word-story:header-default",
        range: { from: 1, to: 4 }
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    };
    const transformedSnapshot = {
      ...snapshot,
      hitTargets: [{
        id: "rotated-picture",
        range: { from: 1, to: 4 },
        rect: { x: 10, y: 20, width: 60, height: 48 },
        hitArea: {
          kind: "polygon",
          points: [
            { x: 40, y: 20 },
            { x: 70, y: 44 },
            { x: 40, y: 68 },
            { x: 10, y: 44 }
          ]
        },
        interactionScope,
        layer,
        pointerPolicy: policy,
        interactionHit: objectHit
      }]
    } satisfies QuireLayoutSnapshot;

    expect(resolveQuireInteractionHitTargetAtPoint({
      snapshot: transformedSnapshot,
      point: { x: 14, y: 24 }
    })).toMatchObject({
      targetKind: "position"
    });
    expect(resolveQuireInteractionHitTargetAtPoint({
      snapshot: transformedSnapshot,
      point: { x: 40, y: 40 }
    })).toMatchObject({
      targetKind: "interaction-hit",
      interactionHit: objectHit
    });
    expect(resolveQuireInteractionNearestCaretAtPoint({
      snapshot: transformedSnapshot,
      point: { x: 40, y: 40 }
    })).toMatchObject({
      kind: "caret",
      interactionScope
    });
  });

  it("resolves positions through the canonical interaction geometry facade", () => {
    expect(
      resolveQuireInteractionPositionAtPoint({
        snapshot,
        point: { x: 26, y: 30 }
      })
    ).toEqual({
      kind: "position",
      source: "retained-position",
      snapshotVersion: 7,
      position: { pos: 3, bias: 0 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("resolves nearest caret queries through an explicit interaction facade", () => {
    expect(
      resolveQuireInteractionNearestCaretAtPoint({
        snapshot,
        point: { x: 130, y: 50 }
      })
    ).toEqual({
      kind: "caret",
      source: "retained-nearest-caret",
      snapshotVersion: 7,
      position: { pos: 4, bias: -1 },
      inside: 0,
      rect: { x: 10, y: 20, width: 30, height: 24 }
    });
  });

  it("resolves caret rectangles with retained snapshot provenance", () => {
    expect(
      resolveQuireInteractionRectAtPosition({
        snapshot,
        position: 2,
        side: 1
      })
    ).toEqual({
      source: "layout-rect",
      snapshotVersion: 7,
      rect: { x: 20, y: 20, width: 1, height: 24 }
    });
  });

  it("uses selection context when resolving repeated sub-layout caret rectangles", () => {
    const lowerOwner = createAuthorityQueryOwner("cell#p5");
    const repeatedSnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        children: [
          createRepeatedSubLayoutCaretNode(
            "wordTable-69:layout#p3",
            60,
            createAuthorityQueryOwner("cell#p3")
          ),
          createRepeatedSubLayoutCaretNode(
            "wordTable-69:layout#p5",
            160,
            lowerOwner
          )
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      resolveQuireInteractionRectAtPosition({
        snapshot: repeatedSnapshot,
        position: 5720,
        side: 1,
        selectionContext: {
          queryOwner: lowerOwner,
          referenceRect: { x: 173, y: 160, width: 1, height: 24 }
        }
      })
    ).toEqual({
      source: "layout-caret",
      snapshotVersion: 7,
      queryOwner: lowerOwner,
      viewRegion: lowerOwner.region,
      rect: { x: 173, y: 160, width: 1, height: 24 }
    });
  });

  it("resolves collapsed carets with retained snapshot provenance", () => {
    expect(
      resolveQuireInteractionCaretAtPosition({
        snapshot,
        position: 2,
        caretWidth: 1
      })
    ).toEqual({
      source: "layout-caret",
      snapshotVersion: 7,
      position: { pos: 2, bias: 0 },
      rect: { x: 20, y: 20, width: 1, height: 24 }
    });
  });

  it("resolves selection rectangles with retained snapshot provenance", () => {
    expect(
      resolveQuireInteractionSelectionRects({
        snapshot,
        range: { from: 1, to: 3 }
      })
    ).toEqual({
      source: "layout-selection-rects",
      snapshotVersion: 7,
      ranges: [
        {
          range: { from: 1, to: 3 },
          rect: { x: 10, y: 20, width: 20, height: 24 }
        }
      ]
    });
  });

  it("keeps viewport fallback explicit when a position has no layout rect", () => {
    expect(
      resolveQuireInteractionRectAtPosition({
        snapshot,
        position: 99,
        side: 1
      })
    ).toEqual({
      source: "viewport-fallback",
      snapshotVersion: 7,
      rect: { x: 10, y: 20, width: 1, height: 200 }
    });
  });

  it("resolves input anchors with retained snapshot provenance", () => {
    const anchorSnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        children: [
          {
            id: "table-cell",
            kind: "block",
            range: { from: 1, to: 8 },
            rect: { x: 40, y: 60, width: 120, height: 48 },
            subLayoutQueryProducts: {
              selectionRects: [],
              caretStops: [],
              hitTargets: [],
              inputAnchors: [
                {
                  position: { pos: 4, bias: 1 },
                  rect: { x: 44, y: 64, width: 1, height: 24 },
                  role: "caret"
                }
              ]
            },
            children: []
          }
        ]
      }
    } satisfies QuireLayoutSnapshot;

    expect(
      createQuireInteractionGeometryAuthority({
        snapshot: anchorSnapshot
      }).inputAnchor(4, "caret")
    ).toEqual({
      source: "sub-layout-input-anchor",
      snapshotVersion: 7,
      rect: { x: 44, y: 64, width: 1, height: 24 }
    });

    expect(
      resolveQuireInteractionInputAnchor({
        snapshot: anchorSnapshot,
        position: 4,
        role: "caret"
      })
    ).toEqual({
      source: "sub-layout-input-anchor",
      snapshotVersion: 7,
      rect: { x: 44, y: 64, width: 1, height: 24 }
    });
  });
});

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
 * Creates query-owner identity for interaction geometry authority fixtures.
 *
 * @param visualInstanceId - Visual instance represented by the query owner.
 * @returns Query-product owner identity.
 */
function createAuthorityQueryOwner(
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
