import { describe, expect, it } from "vitest";
import { adaptQuireLayoutDocumentToSnapshot } from "./adapter";
import { buildQuireDisplayList } from "../display-list";
import type { QuireLayoutSnapshot } from "./types";
import type {
  QuireHitTarget,
  QuireLayoutBox,
  QuireLayoutDocument
} from "../layout/engine/types";
import type { QuireTableHitTarget } from "../layout/engine/table";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireChildFlowRoot } from "@quirekit/layout/child-flow";
import type { QuireRetainedRegionProducts } from "../layout/region-products";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRoot,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type {
  QuireViewGraphPerformanceContract,
  QuireViewInteractionHit
} from "../view-graph";
import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "../view-graph";
import type {
  QuireLayoutBoxSubLayoutFragment,
  QuireSubLayoutProjection
} from "../layout/engine/sub-layout";
import { createQuireTestSubLayoutProjection } from "../../test-support/layout/sub-layout-projection";

const state = { tag: "state" } as unknown as QuireLayoutSnapshot["state"];
const allCapabilities: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};
const requiredPerformance: QuireViewGraphPerformanceContract = {
  invariants: quireViewGraphRequiredPerformanceInvariants,
  invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map(
    (kind) => ({ kind })
  ),
  queryBudget: {
    kind: "viewport-indexed",
    label: "layout snapshot interaction indexes"
  }
};

/**
 * Creates an empty canonical anchor product bundle for unrelated adapter fixtures.
 *
 * @returns Empty retained products satisfying the document contract.
 */
function emptyAnchorRegionProducts(): QuireRetainedRegionProducts {
  return {
    roots: [],
    regions: [],
    hitTargets: [],
    layerContributions: [],
    selectionPolicies: [],
    gaps: []
  };
}
const bodyRoot: QuireLayoutRoot = {
  id: { value: "root:body" },
  kind: "body",
  source: {
    sourceId: "doc:body",
    range: { from: 0, to: 12 }
  },
  capabilities: allCapabilities
};

describe("canvas layout engine snapshot adapter", () => {
  it("graduates region-owned layer contributions into shared render consumers", () => {
    const regionSource = {
      sourceId: "fixture:region",
      range: { from: 2, to: 8 }
    };
    const root = {
      ...bodyRoot,
      source: { sourceId: "fixture:root", range: { from: 1, to: 9 } }
    };
    const region = {
      rootId: root.id,
      regionId: { value: "region:fixture" },
      kind: "interactive-widget" as const
    };
    const rect = { x: 20, y: 30, width: 180, height: 60 };
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      document: {
        id: "doc",
        range: { from: 0, to: 10 },
        rect: { x: 0, y: 0, width: 300, height: 200 },
        children: [{
          id: "fixture",
          range: regionSource.range,
          rect,
          viewRoot: root,
          viewRegion: region,
          viewCapabilities: allCapabilities,
          layoutOwner: { region, source: regionSource, capabilities: allCapabilities },
          regionProducts: {
            roots: [root],
            regions: [{
              ref: region,
              source: regionSource,
              rect,
              coordinateSpace: "document",
              capabilities: allCapabilities
            }],
            hitTargets: [],
            layerContributions: [{
              contributionId: "fixture-chrome",
              owner: { root, region, source: regionSource, capabilities: allCapabilities },
              range: regionSource.range,
              rect,
              coordinateSpace: "document",
              layer: { plane: "controls" },
              paintSurface: "content",
              commands: [{
                id: "fixture-fill",
                kind: "fill-rect",
                layer: "content",
                rect,
                fillStyle: "#f8fafc"
              }],
              domOverlays: [{
                id: "fixture-control",
                range: regionSource.range,
                rect: { x: 160, y: 38, width: 32, height: 20 },
                html: "<button>Open</button>"
              }],
              targets: [{
                id: "fixture-action",
                nodePath: "0.1",
                range: regionSource.range,
                rect: { x: 160, y: 38, width: 32, height: 20 },
                pointerEvents: "auto",
                cursor: "pointer",
                events: { click: { handler: "fixture.open" } }
              }]
            }],
            selectionPolicies: [],
            gaps: []
          }
        }],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });

    expect(snapshot).toMatchObject({
      layerContributions: [expect.objectContaining({ contributionId: "fixture-chrome" })],
      domOverlays: [expect.objectContaining({ id: "fixture-control" })]
    });
    expect(snapshot.hitTargets).toEqual([
      expect.objectContaining({
        source: regionSource,
        interactionHit: expect.objectContaining({
          kind: "widget",
          source: regionSource,
          capabilities: allCapabilities
        })
      })
    ]);
    expect(buildQuireDisplayList({
      snapshot: {
        ...snapshot,
        root: { ...snapshot.root, children: [] }
      }
    }).commands).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "fixture-fill" })])
    );
  });

  it("adapts an engine layout document into the current mounted snapshot shape", () => {
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 0, width: 400, height: 300 },
      document: {
        id: "doc",
        range: { from: 0, to: 6 },
        rect: { x: 10, y: 20, width: 200, height: 48 },
        children: [
          {
            id: "paragraph-0",
            range: { from: 0, to: 6 },
            rect: { x: 10, y: 20, width: 200, height: 24 }
          }
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: [
          {
            pageIndex: 0,
            range: { from: 0, to: 6 },
            pageRect: { x: 0, y: 0, width: 200, height: 260 },
            bodyRect: { x: 24, y: 32, width: 152, height: 196 },
            rect: { x: 24, y: 32, width: 152, height: 24 },
            endInfo: {
              openMarks: [],
              openNodes: []
            }
          }
        ]
      }
    });

    expect(snapshot).toEqual({
      state,
      documentRect: { x: 10, y: 20, width: 200, height: 48 },
      viewportRect: { x: 0, y: 0, width: 400, height: 300 },
      domOverlays: [],
      hitTargets: [],
      consumerCompilation: {
        kind: "ready",
        descriptorsByOwner: {},
        indexedOwnerKeys: []
      },
      interactionQueryIndex: {
        entries: [
          {
            entryId: "layout-node:0:paragraph-0",
            nodeId: "paragraph-0",
            range: { from: 0, to: 6 },
            rect: { x: 10, y: 20, width: 200, height: 24 },
            order: 0,
            depth: 0,
            path: [0]
          }
        ],
        buckets: [
          {
            bucketId: "page:0",
            pageIndex: 0,
            rect: { x: 0, y: 0, width: 200, height: 260 },
            entryIndexes: [0]
          }
        ],
        unbucketedEntryIndexes: [],
        entryCount: 1
      },
      pages: [
        {
          pageIndex: 0,
          range: { from: 0, to: 6 },
          pageRect: { x: 0, y: 0, width: 200, height: 260 },
          bodyRect: { x: 24, y: 32, width: 152, height: 196 }
        }
      ],
      viewGraph: {
        version: expect.any(Number),
        performance: requiredPerformance,
        roots: [],
        regions: []
      },
      root: {
        id: "doc",
        kind: "block",
        range: { from: 0, to: 6 },
        rect: { x: 10, y: 20, width: 200, height: 48 },
        children: [
          {
            id: "paragraph-0",
            kind: "block",
            range: { from: 0, to: 6 },
            rect: { x: 10, y: 20, width: 200, height: 24 },
            children: []
          }
        ]
      }
    });
  });

  it("preserves view graph annotations and builds a requested snapshot graph", () => {
    const blockRegion: QuireLayoutRegionRef = {
      rootId: bodyRoot.id,
      regionId: { value: "region:block:paragraph-0" },
      kind: "block-container",
      parentRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:body" }
      }
    };
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 0, width: 400, height: 300 },
      document: {
        id: "doc",
        range: { from: 0, to: 12 },
        rect: { x: 10, y: 20, width: 200, height: 48 },
        viewRoot: bodyRoot,
        viewRegion: {
          rootId: bodyRoot.id,
          regionId: { value: "region:body" },
          kind: "body"
        },
        viewCapabilities: allCapabilities,
        layoutOwner: {
          region: {
            rootId: bodyRoot.id,
            regionId: { value: "region:body" },
            kind: "body"
          },
          source: bodyRoot.source,
          capabilities: allCapabilities
        },
        children: [
          {
            id: "paragraph-0",
            range: { from: 1, to: 12 },
            rect: { x: 10, y: 20, width: 200, height: 24 },
            viewRegion: blockRegion,
            viewCapabilities: allCapabilities,
            layoutOwner: {
              region: blockRegion,
              source: {
                sourceId: "doc:paragraph-0",
                range: { from: 1, to: 12 }
              },
              capabilities: allCapabilities
            }
          }
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });

    expect(snapshot.root.viewRoot).toEqual(bodyRoot);
    expect(snapshot.root.viewRegion?.kind).toBe("body");
    expect(snapshot.root.children?.[0]?.viewRegion).toEqual(blockRegion);
    expect(snapshot.viewGraph.version).toBeGreaterThan(0);
    expect(snapshot.viewGraph?.roots.map((root) => root.id.value)).toEqual([
      "root:body"
    ]);
    expect(snapshot.viewGraph?.regions.map((region) => region.ref.kind)).toEqual([
      "body",
      "block-container"
    ]);
  });

  it("builds a page-bucketed retained layer target index while adapting", () => {
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 0, width: 400, height: 400 },
      document: {
        id: "doc",
        range: { from: 0, to: 20 },
        rect: { x: 0, y: 0, width: 300, height: 420 },
        children: [],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [
          {
            id: "page-0-control",
            range: { from: 1, to: 4 },
            rect: { x: 20, y: 30, width: 12, height: 12 },
            layer: { plane: "controls" }
          },
          {
            id: "page-1-selection",
            range: { from: 8, to: 12 },
            rect: { x: 20, y: 250, width: 100, height: 24 },
            layer: { plane: "selection" }
          }
        ],
        pages: [
          {
            pageIndex: 0,
            range: { from: 0, to: 6 },
            pageRect: { x: 0, y: 0, width: 300, height: 180 },
            bodyRect: { x: 20, y: 20, width: 260, height: 140 },
            rect: { x: 20, y: 20, width: 260, height: 120 },
            endInfo: { openMarks: [], openNodes: [] }
          },
          {
            pageIndex: 1,
            range: { from: 6, to: 20 },
            pageRect: { x: 0, y: 220, width: 300, height: 180 },
            bodyRect: { x: 20, y: 240, width: 260, height: 140 },
            rect: { x: 20, y: 240, width: 260, height: 120 },
            endInfo: { openMarks: [], openNodes: [] }
          }
        ]
      }
    });

    expect(snapshot.layerTargetIndex?.buckets).toEqual([
      {
        bucketId: "page:0",
        pageIndex: 0,
        rect: { x: 0, y: 0, width: 300, height: 180 },
        targetIds: ["page-0-control"]
      },
      {
        bucketId: "page:1",
        pageIndex: 1,
        rect: { x: 0, y: 220, width: 300, height: 180 },
        targetIds: ["page-1-selection"]
      }
    ]);
  });

  it("adapts table hit targets from the engine document contract", () => {
    const documentTarget = createTableHitTarget({
      id: "cell-target-document",
      rect: { x: 0, y: 0, width: 50, height: 20 }
    });
    const treeTarget = createTableHitTarget({
      id: "cell-target-tree",
      rect: { x: 40, y: 850, width: 50, height: 20 }
    });
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 800, width: 400, height: 300 },
      document: createDocumentWithSeparateTableTargetSources({
        documentHitTarget: documentTarget,
        tableHitTarget: treeTarget
      })
    });

    expect(snapshot.hitTargets).toEqual([
      expect.objectContaining({
        ...documentTarget,
        layer: { plane: "content" },
        pointerPolicy: {
          kind: "select",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        }
      })
    ]);
  });

  it("preserves generic retained hit targets with default layer policy", () => {
    const controlLayer = { plane: "controls", zIndex: 20, priority: 5 } as const;
    const controlPolicy = {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    } as const;
    const controlTarget = {
      id: "table-resize-handle",
      range: { from: 2, to: 6 },
      rect: { x: 46, y: 20, width: 8, height: 28 },
      interactionHit: createControlInteractionHit({
        layer: controlLayer,
        pointerPolicy: controlPolicy
      })
    } satisfies QuireHitTarget;
    const contentTarget = {
      id: "table-cell-content",
      range: { from: 2, to: 6 },
      rect: { x: 10, y: 20, width: 150, height: 28 }
    } satisfies QuireHitTarget;
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 0, width: 400, height: 300 },
      document: {
        id: "doc",
        range: { from: 0, to: 12 },
        rect: { x: 0, y: 0, width: 300, height: 120 },
        children: [],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [controlTarget, contentTarget],
        pages: []
      }
    });

    expect(snapshot.hitTargets).toEqual([
      expect.objectContaining({
        id: "table-resize-handle",
        layer: controlLayer,
        pointerPolicy: controlPolicy,
        interactionHit: expect.objectContaining({
          layer: controlLayer,
          pointerPolicy: controlPolicy
        })
      }),
      expect.objectContaining({
        id: "table-cell-content",
        layer: { plane: "content" },
        pointerPolicy: {
          kind: "select",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        }
      })
    ]);
  });

  it("clips adapted snapshot nodes and hit targets while preserving page metadata", () => {
    const visibleTarget = createTableHitTarget({
      id: "visible-cell-target",
      rect: { x: 20, y: 220, width: 50, height: 20 }
    });
    const hiddenTarget = createTableHitTarget({
      id: "hidden-cell-target",
      rect: { x: 20, y: 520, width: 50, height: 20 }
    });
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 200, width: 300, height: 120 },
      snapshotClipRects: [{ x: 0, y: 200, width: 300, height: 120 }],
      document: {
        id: "doc",
        range: { from: 0, to: 12 },
        rect: { x: 0, y: 0, width: 300, height: 600 },
        children: [
          {
            id: "paragraph-hidden-before",
            range: { from: 0, to: 4 },
            rect: { x: 0, y: 40, width: 300, height: 40 }
          },
          {
            id: "paragraph-visible",
            range: { from: 4, to: 8 },
            rect: { x: 0, y: 0, width: 300, height: 600 },
            textFragments: [
              createTextFragment({ id: "line-hidden-before", y: 40 }),
              createTextFragment({ id: "line-visible", y: 220 }),
              createTextFragment({ id: "line-hidden-after", y: 520 })
            ]
          },
          {
            id: "paragraph-hidden-after",
            range: { from: 8, to: 12 },
            rect: { x: 0, y: 520, width: 300, height: 40 }
          }
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [hiddenTarget, visibleTarget],
        pages: [
          {
            pageIndex: 0,
            range: { from: 0, to: 4 },
            pageRect: { x: 0, y: 0, width: 300, height: 180 },
            bodyRect: { x: 20, y: 20, width: 260, height: 140 },
            rect: { x: 20, y: 20, width: 260, height: 40 },
            endInfo: { openMarks: [], openNodes: [] }
          },
          {
            pageIndex: 1,
            range: { from: 4, to: 8 },
            pageRect: { x: 0, y: 200, width: 300, height: 180 },
            bodyRect: { x: 20, y: 220, width: 260, height: 140 },
            rect: { x: 20, y: 220, width: 260, height: 40 },
            endInfo: { openMarks: [], openNodes: [] }
          },
          {
            pageIndex: 2,
            range: { from: 8, to: 12 },
            pageRect: { x: 0, y: 400, width: 300, height: 180 },
            bodyRect: { x: 20, y: 420, width: 260, height: 140 },
            rect: { x: 20, y: 520, width: 260, height: 40 },
            endInfo: { openMarks: [], openNodes: [] }
          }
        ]
      }
    });

    expect(snapshot.documentRect).toEqual({ x: 0, y: 0, width: 300, height: 600 });
    expect(snapshot.pages?.map((page) => page.pageIndex)).toEqual([0, 1, 2]);
    expect(snapshot.root.children?.map((node) => node.id)).toEqual(["paragraph-visible"]);
    expect(snapshot.root.children?.[0]?.textFragments?.map((fragment) => fragment.id)).toEqual([
      "line-visible"
    ]);
    expect(snapshot.hitTargets.map((target) => target.id)).toEqual(["visible-cell-target"]);
  });

  it.each([
    { label: "inside", x: 40, y: 220, visible: true },
    { label: "on the inline start edge", x: 20, y: 220, visible: true },
    { label: "on the inline end edge", x: 120, y: 220, visible: true },
    { label: "partly above", x: 40, y: 190, visible: true },
    { label: "partly below", x: 40, y: 290, visible: true },
    { label: "before the inline start", x: 19, y: 220, visible: false },
    { label: "after the inline end", x: 121, y: 220, visible: false },
    { label: "touching the block start", x: 40, y: 176, visible: false },
    { label: "touching the block end", x: 40, y: 300, visible: false }
  ])("keeps zero-width caret lines $label of the snapshot clip only when visible", ({
    x, y, visible
  }) => {
    const fragment: QuireTextFragment = {
      id: "empty-paragraph:line",
      text: "",
      range: { from: 1, to: 1 },
      rect: { x, y, width: 0, height: 24 },
      font: "16px sans-serif",
      lineHeight: 24,
      baseline: y + 18,
      caretStops: [{ position: { pos: 1, bias: 1 }, localX: 0 }]
    };
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 0, width: 300, height: 600 },
      snapshotClipRects: [{ x: 20, y: 200, width: 100, height: 100 }],
      document: {
        id: "doc",
        range: { from: 0, to: 2 },
        rect: { x: 0, y: 0, width: 300, height: 600 },
        children: [{
          id: "empty-paragraph",
          range: { from: 0, to: 2 },
          rect: { x: 0, y: 0, width: 300, height: 600 },
          textFragments: [fragment]
        }],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });

    const fragments = snapshot.root.children?.[0]?.textFragments;
    expect(fragments).toEqual(visible ? [fragment] : []);
    if (visible) {
      // Visibility must preserve the complete source line, not clip caret metrics.
      expect(fragments?.[0]).toBe(fragment);
    }
  });

  it("adapts retained sub-layout query products onto snapshot nodes", () => {
    const bodyResult = createSubLayoutResult({
      id: "body-cell",
      range: { from: 4, to: 8 },
      y: 220
    });
    const repeatedHeaderResult = createSubLayoutResult({
      id: "repeated-header-cell",
      range: { from: 1, to: 4 },
      y: 240
    });
    const hiddenResult = createSubLayoutResult({
      id: "hidden-cell",
      range: { from: 8, to: 12 },
      y: 520
    });
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 200, width: 300, height: 120 },
      snapshotClipRects: [{ x: 0, y: 200, width: 300, height: 120 }],
      document: {
        id: "doc",
        range: { from: 0, to: 12 },
        rect: { x: 0, y: 0, width: 300, height: 600 },
        children: [
          createSubLayoutContainer({
            subLayoutFragments: [
              { subLayout: bodyResult },
              { subLayout: hiddenResult },
              { subLayout: repeatedHeaderResult }
            ]
          })
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });
    const products = snapshot.root.children?.[0]?.subLayoutQueryProducts;

    expect(products?.selectionRects.map((selection) => selection.range)).toEqual([
      { from: 4, to: 8 },
      { from: 1, to: 4 }
    ]);
    expect(products?.caretStops.map((stop) => stop.position.pos)).toEqual([
      4,
      1
    ]);
    expect(products?.hitTargets.map((target) => target.id)).toEqual([
      "body-cell-hit",
      "repeated-header-cell-hit"
    ]);
    expect(products?.inputAnchors.map((anchor) => anchor.position.pos)).toEqual([
      4,
      1
    ]);
    expect(products?.selectionRects[0]?.queryOwner).toMatchObject({
      sourceRootId: "table-cell:body-cell",
      sourceFragmentId: "body-cell:fragment",
      coordinateSpace: "document",
      sourceCoordinateSpace: "table-cell-local",
      coordinatePath: {
        spaces: ["table-cell-local", "document"],
        steps: [
          {
            from: "table-cell-local",
            to: "document",
            input: { space: "table-cell-local", x: 0, y: 0 },
            output: { space: "document", x: 0, y: 0 },
            scaleX: 1,
            scaleY: 1
          }
        ]
      }
    });
    expect(products?.caretStops[0]?.queryOwner).toEqual(
      products?.selectionRects[0]?.queryOwner
    );
    expect(products?.hitTargets[0]?.queryOwner).toEqual(
      products?.selectionRects[0]?.queryOwner
    );
    expect(products?.inputAnchors[0]?.queryOwner).toEqual(
      products?.selectionRects[0]?.queryOwner
    );
  });

  it("adapts retained sub-layout source boxes as snapshot children", () => {
    const sourceBox = createSubLayoutSourceBox({
      id: "cell-a#p1",
      y: 220
    });
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 200, width: 300, height: 120 },
      snapshotClipRects: [{ x: 0, y: 200, width: 300, height: 120 }],
      document: {
        id: "doc",
        range: { from: 0, to: 12 },
        rect: { x: 0, y: 0, width: 300, height: 600 },
        children: [
          createSubLayoutContainer({
            subLayoutFragments: [
              {
                subLayout: createSubLayoutResultWithSourceBox({
                  id: "body-cell",
                  range: { from: 4, to: 8 },
                  y: 220,
                  sourceBox
                })
              }
            ]
          })
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });
    const tableChildren = snapshot.root.children?.[0]?.children ?? [];

    expect(tableChildren.map((node) => node.id)).toEqual(["cell-a#p1"]);
    expect(tableChildren[0]?.interactionRole).toBe("source-geometry");
    expect(tableChildren[0]?.children?.map((node) => node.id)).toEqual([
      "cell-a#p1:paragraph"
    ]);
    expect(tableChildren[0]?.children?.[0]?.interactionRole).toBe(
      "source-geometry"
    );
  });

  it("keeps retained products on the sub-layout occurrence instead of its source geometry", () => {
    const source = { sourceId: "cell-a", range: { from: 4, to: 8 } };
    const viewRoot: QuireLayoutRoot = {
      id: { value: "root:cell-a" },
      kind: "table-cell",
      source,
      capabilities: allCapabilities
    };
    const viewRegion: QuireLayoutRegionRef = {
      rootId: viewRoot.id,
      regionId: { value: "region:cell-a" },
      kind: "table-cell",
      visualInstanceId: "cell-a#p1"
    };
    const rect = { x: 20, y: 220, width: 80, height: 20 };
    const regionProducts: QuireRetainedRegionProducts = {
      roots: [viewRoot],
      regions: [{
        ref: viewRegion,
        source,
        rect,
        coordinateSpace: "document",
        capabilities: allCapabilities
      }],
      hitTargets: [],
      layerContributions: [],
      selectionPolicies: [],
      gaps: []
    };
    const staleSinglePageResult = createSubLayoutResult({
      id: "single-page-cell-a",
      range: source.range,
      y: 220
    });
    const sourceBox = {
      ...createSubLayoutSourceBox({ id: "cell-a#p1", y: 220 }),
      regionProducts,
      subLayoutFragments: [{
        subLayout: {
          ...staleSinglePageResult,
          view: {
            ...staleSinglePageResult.view,
            root: {
              ownership: {
                status: "resolved" as const,
                root: viewRoot,
                owner: {
                  region: viewRegion,
                  source,
                  capabilities: allCapabilities
                },
                regionProducts
              }
            }
          }
        }
      }]
    };
    const sourceResult = createSubLayoutResultWithSourceBox({
      id: "body-cell",
      range: source.range,
      y: 220,
      sourceBox
    });
    const result = {
      ...sourceResult,
      view: {
        ...sourceResult.view,
        root: {
          ownership: {
            status: "resolved" as const,
            root: viewRoot,
            owner: {
              region: viewRegion,
              source,
              capabilities: allCapabilities
            },
            regionProducts
          }
        }
      }
    };
    const snapshot = adaptQuireLayoutDocumentToSnapshot({
      state,
      viewportRect: { x: 0, y: 200, width: 300, height: 120 },
      snapshotClipRects: [{ x: 0, y: 200, width: 300, height: 120 }],
      document: {
        id: "doc",
        range: { from: 0, to: 12 },
        rect: { x: 0, y: 0, width: 300, height: 600 },
        children: [
          createSubLayoutContainer({
            subLayoutFragments: [{ subLayout: result }]
          })
        ],
        anchors: [],
        anchorOccurrenceGaps: [],
        anchorRegionProducts: emptyAnchorRegionProducts(),
        anchorPlacementGaps: [],
        hitTargets: [],
        pages: []
      }
    });
    const container = snapshot.root.children?.[0];
    const sourceGeometry = container?.children?.[0];

    expect(container?.regionProducts?.regions).toEqual([
      expect.objectContaining({ ref: viewRegion })
    ]);
    expect(sourceGeometry?.interactionRole).toBe("source-geometry");
    expect(sourceGeometry?.regionProducts).toBeUndefined();
    expect(sourceGeometry?.subLayoutQueryProducts).toBeUndefined();
    expect(sourceGeometry?.subLayoutDisplayChunks).toBeUndefined();
  });
});

/**
 * Creates a table hit target fixture.
 *
 * @param options - Target id and rectangle.
 * @returns Table hit target fixture.
 */
function createTableHitTarget(options: {
  /** Stable hit target id. */
  readonly id: string;
  /** Hit target rectangle. */
  readonly rect: QuireTableHitTarget["rect"];
}): QuireTableHitTarget {
  return {
    kind: "cell",
    id: options.id,
    tableId: "wordTable-0",
    semanticCellId: "cell-0-0",
    originExplicitCellId: "cell-0-0",
    explicitCellIds: ["cell-0-0"],
    originCellPos: 1,
    range: { from: 1, to: 4 },
    rect: options.rect
  };
}

/**
 * Creates a retained interaction region for adapter tests.
 *
 * @returns Retained view region reference.
 */
function createControlRegion(): QuireLayoutRegionRef {
  return {
    rootId: { value: "body-root" },
    regionId: { value: "control-region" },
    kind: "control"
  };
}

/**
 * Creates a retained control interaction hit for adapter tests.
 *
 * @param options - Optional retained layer and pointer policy facts.
 * @returns Retained control interaction hit.
 */
function createControlInteractionHit(
  options: Pick<QuireViewInteractionHit, "layer" | "pointerPolicy">
): QuireViewInteractionHit {
  return {
    kind: "control",
    region: createControlRegion(),
    controlId: "table-resize-handle",
    ...options
  };
}

/**
 * Creates a text fragment fixture.
 *
 * @param options - Fragment id and top coordinate.
 * @returns Text fragment fixture.
 */
function createTextFragment(options: {
  /** Stable fragment id. */
  readonly id: string;
  /** Fragment top in document coordinates. */
  readonly y: number;
}): QuireTextFragment {
  return {
    id: options.id,
    text: "line",
    range: { from: 4, to: 8 },
    rect: { x: 20, y: options.y, width: 260, height: 20 },
    font: "16px sans-serif",
    lineHeight: 20,
    baseline: options.y + 16,
    caretStops: []
  };
}

/**
 * Creates a layout box carrying retained sub-layout fragments.
 *
 * @param options - Retained sub-layout fragments.
 * @returns Layout box fixture with retained fragment metadata.
 */
function createSubLayoutContainer(options: {
  /** Retained sub-layout fragments. */
  readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
}): QuireLayoutBox {
  return {
    id: "wordTable-0:layout#p1",
    range: { from: 1, to: 12 },
    rect: { x: 0, y: 200, width: 300, height: 120 },
    children: [],
    subLayoutFragments: options.subLayoutFragments
  } as QuireLayoutBox;
}

/**
 * Creates a sub-layout result fixture with one query product in each bucket.
 *
 * @param options - Result identity, document range, and vertical placement.
 * @returns Sub-layout result fixture.
 */
function createSubLayoutResult(options: {
  /** Stable result id stem. */
  readonly id: string;
  /** Document range represented by the result. */
  readonly range: QuireChildFlowRoot["range"];
  /** Query product top coordinate. */
  readonly y: number;
}): QuireSubLayoutProjection {
  const root = createSubLayoutRoot(options);
  const rect = { x: 20, y: options.y, width: 80, height: 20 };

  return createQuireTestSubLayoutProjection({
    root,
    resultId: `${options.id}:fragment`,
    acceptedBand: { top: options.y, bottom: options.y + 20 },
    localToResult: { x: 0, y: 0 },
    contentClip: rect,
    interactionClip: rect,
    queryProducts: {
      selectionRects: [{
        textFragmentId: `${options.id}:text`,
        range: options.range,
        rect
      }],
      caretStops: [
        {
          textFragmentId: `${options.id}:text`,
          position: { pos: options.range.from, bias: 1 },
          rect,
          fragmentId: `${options.id}:fragment`
        }
      ],
      hitTargets: [
        {
          id: `${options.id}-hit`,
          range: options.range,
          rect
        }
      ],
      inputAnchors: [
        {
          position: { pos: options.range.from, bias: 1 },
          rect,
          role: "caret"
        }
      ]
    },
    dependencySignature: root.dependencySignature
  });
}

/**
 * Creates a sub-layout result fixture with one retained source box child.
 *
 * @param options - Result identity, range, vertical placement, and source box.
 * @returns Sub-layout result fixture with child fragment provenance.
 */
function createSubLayoutResultWithSourceBox(options: {
  /** Stable result id stem. */
  readonly id: string;
  /** Document range represented by the result. */
  readonly range: QuireChildFlowRoot["range"];
  /** Query product top coordinate. */
  readonly y: number;
  /** Page-local source box retained by the sub-layout result. */
  readonly sourceBox: QuireLayoutBox;
}): QuireSubLayoutProjection {
  const root = createSubLayoutRoot(options);
  const rect = options.sourceBox.rect;

  return createQuireTestSubLayoutProjection({
    root,
    resultId: `${options.id}:fragment`,
    acceptedBand: { top: options.y, bottom: options.y + 20 },
    fragments: [
      {
        id: options.sourceBox.id,
        sourceId: options.sourceBox.id,
        range: options.sourceBox.range,
        rect,
        localRect: {
          x: rect.x - root.placement.contentRect.x,
          y: rect.y - root.placement.contentRect.y,
          width: rect.width,
          height: rect.height
        }
      }
    ],
    fragmentSources: [{
      fragmentId: options.sourceBox.id,
      sourceBox: options.sourceBox
    }],
    localToResult: { x: 0, y: 0 },
    contentClip: rect,
    interactionClip: rect,
    queryProducts: {
      selectionRects: [],
      caretStops: [],
      hitTargets: [],
      inputAnchors: []
    },
    dependencySignature: root.dependencySignature
  });
}

/**
 * Creates a source layout box retained by a sub-layout child fragment.
 *
 * @param options - Source box identity and top coordinate.
 * @returns Layout box fixture with one nested paragraph.
 */
function createSubLayoutSourceBox(options: {
  /** Stable source box id. */
  readonly id: string;
  /** Source box top in document coordinates. */
  readonly y: number;
}): QuireLayoutBox {
  return {
    id: options.id,
    range: { from: 4, to: 8 },
    rect: { x: 20, y: options.y, width: 80, height: 20 },
    children: [
      {
        id: `${options.id}:paragraph`,
        range: { from: 4, to: 8 },
        rect: { x: 20, y: options.y, width: 80, height: 20 }
      }
    ]
  } as QuireLayoutBox;
}

/**
 * Creates a sub-layout root fixture for adapter tests.
 *
 * @param options - Root identity, range, and vertical placement.
 * @returns Sub-layout root fixture.
 */
function createSubLayoutRoot(options: {
  /** Stable root id stem. */
  readonly id: string;
  /** Document range represented by the root. */
  readonly range: QuireChildFlowRoot["range"];
  /** Root top coordinate. */
  readonly y: number;
}): QuireChildFlowRoot {
  return {
    id: `table-cell:${options.id}`,
    kind: "table-cell",
    range: options.range,
    placement: {
      parentId: "wordTable-0:layout#p1",
      rect: { x: 20, y: options.y, width: 80, height: 20 },
      contentRect: { x: 20, y: options.y, width: 80, height: 20 }
    },
    localRect: { x: 0, y: 0, width: 80, height: 20 },
    writingMode: "horizontal-tb",
    dependencySignature: `${options.id}:signature`
  };
}

/**
 * Creates an engine document whose document-level hit target cache can differ
 * from the nested table snapshot.
 *
 * @param options - Document-level target and nested table target.
 * @returns Engine layout document fixture.
 */
function createDocumentWithSeparateTableTargetSources(options: {
  /** Target carried at document level. */
  readonly documentHitTarget: QuireTableHitTarget;
  /** Target carried by the nested table snapshot. */
  readonly tableHitTarget: QuireTableHitTarget;
}): QuireLayoutDocument {
  return {
    id: "doc",
    range: { from: 0, to: 6 },
    rect: { x: 40, y: 850, width: 200, height: 48 },
    children: [
      {
        id: "wordTable-0:layout#p1",
        range: { from: 1, to: 6 },
        rect: { x: 40, y: 850, width: 200, height: 48 },
        table: {
          tableId: "wordTable-0",
          fragmentId: "wordTable-0#p1",
          geometryId: "wordTable-0#p1",
          tableRange: { from: 1, to: 6 },
          style: {
            backgroundColor: null,
            borderColor: "#cbd5e1",
            borderWidth: 1
          },
          borders: null,
          rect: { x: 40, y: 850, width: 200, height: 48 },
          tracks: [],
          rows: [],
          cells: [],
          hitTargets: [options.tableHitTarget]
        }
      }
    ],
    anchors: [],
    anchorOccurrenceGaps: [],
    anchorRegionProducts: emptyAnchorRegionProducts(),
    anchorPlacementGaps: [],
    hitTargets: [options.documentHitTarget],
    pages: []
  };
}
