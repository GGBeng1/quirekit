import { describe, expect, it } from "vitest";
import type { QuireLayoutNode, QuireLayoutProductSnapshot } from "../types";
import { createQuireLayoutSnapshotViewGraph } from ".";
import type { QuireRetainedRegionProducts } from "../region-products";
import { createQuireLayoutInteractionQueryIndex } from "../query-index";
import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "../../view-graph";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutSourceRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireViewGraphPerformanceContract
} from "../../view-graph";

const allCapabilities: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};

const bodyRoot: QuireLayoutRoot = {
  id: { value: "root:body" },
  kind: "body",
  source: {
    sourceId: "doc:body",
    range: { from: 0, to: 10 }
  },
  capabilities: allCapabilities
};

const requiredPerformance: QuireViewGraphPerformanceContract = {
  invariants: quireViewGraphRequiredPerformanceInvariants,
  invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map(
    (kind) => ({
      kind
    })
  ),
  queryBudget: {
    kind: "viewport-indexed",
    label: "layout view graph production queries"
  }
};

const emptyRegionProducts: QuireRetainedRegionProducts = {
  roots: [],
  regions: [],
  hitTargets: [],
  layerContributions: [],
  selectionPolicies: [],
  gaps: []
};

/**
 * Creates a minimal layout snapshot for view-graph production tests.
 *
 * @param root - Root layout node to attach to the snapshot.
 * @returns Layout snapshot containing the supplied root.
 */
function createSnapshot(root: QuireLayoutNode): QuireLayoutProductSnapshot {
  const viewportRect = root.rect;
  return {
    root,
    documentRect: root.rect,
    viewportRect,
    domOverlays: [],
    hitTargets: [],
    interactionQueryIndex: createQuireLayoutInteractionQueryIndex({
      root,
      viewportRect
    })
  };
}

/**
 * Creates a minimal layout node for view-graph production tests.
 *
 * @param overrides - Optional layout node fields to override.
 * @returns Layout node with deterministic geometry and range.
 */
function createNode(
  overrides: Partial<QuireLayoutNode> = {}
): QuireLayoutNode {
  return {
    id: "node:body",
    kind: "block",
    range: { from: 0, to: 10 },
    rect: { x: 0, y: 0, width: 100, height: 20 },
    ...overrides
  };
}

/**
 * Creates a layout node with an explicit region-owned source projection.
 *
 * @param overrides - Node fields including complete region and capability facts.
 * @param source - Source owned by the exact region.
 * @returns Layout node carrying a complete interaction owner.
 */
function createOwnedNode(
  overrides: Partial<QuireLayoutNode> & {
    readonly viewRegion: NonNullable<QuireLayoutNode["viewRegion"]>;
    readonly viewCapabilities: NonNullable<
      QuireLayoutNode["viewCapabilities"]
    >;
  },
  source: QuireLayoutSourceRef
): QuireLayoutNode {
  return createNode({
    ...overrides,
    layoutOwner: {
      region: overrides.viewRegion,
      source,
      capabilities: overrides.viewCapabilities
    }
  });
}

describe("layout view graph production", () => {
  it("adapts explicitly annotated layout nodes", () => {
    const snapshot = createSnapshot(createOwnedNode({
      viewRoot: bodyRoot,
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:body" },
        kind: "body"
      },
      viewCapabilities: allCapabilities
    }, bodyRoot.source));

    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts: emptyRegionProducts,
      version: 1,
      performance: requiredPerformance
    });

    expect(result.gaps).toEqual([]);
    expect(result.graph?.roots).toHaveLength(1);
    expect(result.graph?.regions[0]?.ref.kind).toBe("body");
  });

  it("uses the explicit region source instead of the owning root source", () => {
    const childSource = {
      sourceId: "doc:nested-region",
      range: { from: 2, to: 4 }
    };
    const child = createOwnedNode({
      id: "node:child",
      range: { from: 2, to: 4 },
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:child" },
        kind: "node-body"
      },
      viewCapabilities: allCapabilities
    }, childSource);
    const snapshot = createSnapshot(createOwnedNode({
      viewRoot: bodyRoot,
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:body" },
        kind: "body"
      },
      viewCapabilities: allCapabilities,
      children: [child]
    }, bodyRoot.source));

    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts: emptyRegionProducts,
      version: 1,
      performance: requiredPerformance
    });

    expect(result.gaps).toEqual([]);
    expect(result.graph?.regions.find(
      (region) => region.ref.regionId.value === "region:child"
    )?.source).toEqual(childSource);
  });

  it("reuses the exact installed region when flow and visual rectangles differ", () => {
    const regionRef = {
      rootId: bodyRoot.id,
      regionId: { value: "region:table" },
      kind: "block-container" as const
    };
    const region = {
      ref: regionRef,
      source: bodyRoot.source,
      rect: { x: 10, y: 20, width: 120, height: 30 },
      coordinateSpace: "document" as const,
      capabilities: allCapabilities
    };
    const regionProducts: QuireRetainedRegionProducts = {
      ...emptyRegionProducts,
      roots: [bodyRoot],
      regions: [region]
    };
    const snapshot = createSnapshot(createOwnedNode({
      id: "node:table",
      rect: { x: 10, y: 20, width: 100, height: 50 },
      viewRoot: bodyRoot,
      viewRegion: regionRef,
      viewCapabilities: allCapabilities,
      regionProducts
    }, bodyRoot.source));

    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts,
      version: 1,
      performance: requiredPerformance
    });

    expect(result.gaps).toEqual([]);
    expect(result.graph?.regions).toEqual([region]);
  });

  it("does not invent retained products for unannotated layout nodes", () => {
    const snapshot = createSnapshot(createNode());

    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts: emptyRegionProducts,
      version: 1,
      performance: requiredPerformance
    });

    expect(result.gaps).toEqual([]);
    expect(result.graph?.regions).toEqual([]);
  });

  it("reports missing roots before adapting a region", () => {
    const snapshot = createSnapshot(createOwnedNode({
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:body" },
        kind: "body"
      },
      viewCapabilities: allCapabilities
    }, bodyRoot.source));

    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts: emptyRegionProducts,
      version: 1,
      performance: requiredPerformance
    });

    expect(result.graph).toBeNull();
    expect(result.gaps.map((gap) => gap.code)).toEqual(["missing-view-root"]);
  });

  it("makes scan-bounded consumer compilation wholly unavailable over budget", () => {
    const first = createOwnedNode({
      id: "node:first",
      range: { from: 1, to: 4 },
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:first" },
        kind: "node-body"
      },
      viewCapabilities: allCapabilities
    }, bodyRoot.source);
    const second = createOwnedNode({
      id: "node:second",
      range: { from: 5, to: 9 },
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:second" },
        kind: "node-body"
      },
      viewCapabilities: allCapabilities
    }, bodyRoot.source);
    const snapshot = createSnapshot(createOwnedNode({
      viewRoot: bodyRoot,
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:body" },
        kind: "body"
      },
      viewCapabilities: allCapabilities,
      children: [first, second]
    }, bodyRoot.source));
    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts: emptyRegionProducts,
      version: 2,
      performance: {
        ...requiredPerformance,
        queryBudget: { kind: "scan-bounded", maxScannedItems: 1 }
      }
    });

    expect(result.graph).not.toBeNull();
    expect(result.consumerCompilation).toEqual({
      kind: "unavailable",
      gaps: [expect.objectContaining({
        code: "query-budget-exceeded",
        candidateCount: 3,
        maxScannedItems: 1
      })]
    });
  });

  it("rejects viewport-indexed consumer compilation without its query index", () => {
    const child = createOwnedNode({
      id: "node:child",
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:child" },
        kind: "node-body"
      },
      viewCapabilities: allCapabilities
    }, bodyRoot.source);
    const indexed = createSnapshot(createOwnedNode({
      viewRoot: bodyRoot,
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:body" },
        kind: "body"
      },
      viewCapabilities: allCapabilities,
      children: [child]
    }, bodyRoot.source));
    const { interactionQueryIndex: _index, ...snapshot } = indexed;
    const result = createQuireLayoutSnapshotViewGraph({
      snapshot,
      regionProducts: emptyRegionProducts,
      version: 3,
      performance: requiredPerformance
    });

    expect(result.graph).not.toBeNull();
    expect(result.consumerCompilation).toEqual({
      kind: "unavailable",
      gaps: [expect.objectContaining({
        code: "missing-consumer-query-index"
      })]
    });
  });

  it("indexes compiled descriptors by exact retained owner", () => {
    const child = createOwnedNode({
      id: "node:child",
      range: { from: 2, to: 4 },
      viewRegion: {
        rootId: bodyRoot.id,
        regionId: { value: "region:child" },
        kind: "node-body",
        visualInstanceId: "instance:one"
      },
      viewCapabilities: allCapabilities
    }, bodyRoot.source);
    const result = createQuireLayoutSnapshotViewGraph({
      snapshot: createSnapshot(createOwnedNode({
        viewRoot: bodyRoot,
        viewRegion: {
          rootId: bodyRoot.id,
          regionId: { value: "region:body" },
          kind: "body"
        },
        viewCapabilities: allCapabilities,
        children: [child]
      }, bodyRoot.source)),
      regionProducts: emptyRegionProducts,
      version: 4,
      performance: requiredPerformance
    });

    expect(result.consumerCompilation.kind).toBe("ready");
    if (result.consumerCompilation.kind !== "ready") {
      throw new Error("Expected indexed consumer compilation.");
    }
    expect(result.consumerCompilation.descriptorsByOwner[
      "root:body\u0000region:child\u0000instance:one"
    ]?.owner.region).toEqual(child.viewRegion);
    expect(result.consumerCompilation.indexedOwnerKeys).toContain(
      "root:body\u0000region:child\u0000instance:one"
    );
  });

  it("reports a missing runtime query budget as invalid-query-budget", () => {
    const performance = {
      ...requiredPerformance,
      queryBudget: undefined
    } as unknown as QuireViewGraphPerformanceContract;
    const result = createQuireLayoutSnapshotViewGraph({
      snapshot: createSnapshot(createNode()),
      regionProducts: emptyRegionProducts,
      version: 5,
      performance
    });

    expect(result.graph).toBeNull();
    expect(result.consumerCompilation).toEqual({
      kind: "unavailable",
      gaps: [expect.objectContaining({ code: "invalid-query-budget" })]
    });
  });

});
