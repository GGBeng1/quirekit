import { describe, expect, it } from "vitest";
import type { QuireLayoutSnapshot } from "../editor-layout";
import type { QuireViewUpdatePatch } from "../invalidation";
import { deriveQuireViewUpdatePatch } from "../invalidation";
import {
  createQuireDisplayInvalidationProjection,
  createQuireRetainedDisplayOwnerChunkCollector,
  createQuireRetainedDisplayOwnerDiagnostics,
  createQuireRetainedDisplayOwnerIndex
} from ".";
import { resolveQuireLayerContributionProductId } from "../layout/region-products/layer-contribution/identity";

describe("retained display ownership", () => {
  it("indexes a floating table by its visual rectangle instead of its zero-height anchor", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const sourceNode = snapshot.root.children![0]!;
    const floatingTableSnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        children: [{
          ...sourceNode,
          id: "floating-table",
          rect: { x: 10, y: 10, width: 80, height: 0 },
          table: {
            tableId: "floating-table",
            fragmentId: "floating-table",
            geometryId: "floating-table",
            tableRange: sourceNode.range,
            style: {
              backgroundColor: null,
              borderColor: "#cbd5e1",
              borderWidth: 1
            },
            borders: null,
            rect: { x: 20, y: 120, width: 120, height: 60 },
            tracks: [],
            rows: [],
            cells: [],
            hitTargets: []
          }
        }]
      }
    } as QuireLayoutSnapshot;

    const index = createQuireRetainedDisplayOwnerIndex({
      snapshot: floatingTableSnapshot
    });
    const owner = index.owners.find(
      (candidate) => candidate.productId === "floating-table"
    );

    expect(owner?.rect).toEqual({ x: 20, y: 120, width: 120, height: 60 });
    expect(owner?.pageIndexes).toEqual([1]);
  });

  it("indexes explicit layout owners without deriving source identity from pages", () => {
    const index = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });

    expect(index.gaps).toEqual([]);
    expect(index.owners.map((owner) => owner.productId)).toEqual([
      "paragraph:first",
      "paragraph:second",
      "page-chrome"
    ]);
    expect(index.owners[0]?.region.visualInstanceId).toBe("body-instance:0");
    expect(index.owners[1]?.region.visualInstanceId).toBe("body-instance:1");
    expect(index.owners[0]?.paintScope).toBe("layout-content");
    expect(index.owners[2]?.paintScope).toBe("page-chrome");
    expect(index.ownerKeysByPageIndex[0]).toHaveLength(2);
    expect(index.ownerKeysByPageIndex[1]).toHaveLength(2);
  });

  it("records a diagnostic gap instead of assigning missing owner facts from geometry", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const missingOwnerSnapshot = {
      ...snapshot,
      root: {
        ...snapshot.root,
        children: [{
          ...snapshot.root.children![0]!,
          layoutOwner: undefined
        }]
      }
    } as QuireLayoutSnapshot;

    const index = createQuireRetainedDisplayOwnerIndex({
      snapshot: missingOwnerSnapshot
    });

    expect(index.gaps).toEqual([{
      code: "layout-owner-missing",
      productId: "paragraph:first",
      message: expect.stringContaining("paragraph:first")
    }]);
    expect(index.owners.map((owner) => owner.productId)).not.toContain("paragraph:first");
  });

  it("rejects repeated region owners that omit visual-instance identity", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const repeatedWithoutInstances = {
      ...snapshot,
      pages: undefined,
      root: {
        ...snapshot.root,
        children: snapshot.root.children?.map((child) => ({
          ...child,
          id: "paragraph:repeated",
          layoutOwner: child.layoutOwner === undefined
            ? undefined
            : {
                ...child.layoutOwner,
                region: {
                  ...child.layoutOwner.region,
                  visualInstanceId: undefined
                },
                source: {
                  sourceId: "source:repeated",
                  range: { from: 1, to: 9 }
                }
              }
        }))
      }
    } as QuireLayoutSnapshot;

    const index = createQuireRetainedDisplayOwnerIndex({
      snapshot: repeatedWithoutInstances
    });

    expect(index.owners).toEqual([]);
    expect(index.gaps.map((gap) => gap.code)).toEqual([
      "visual-instance-missing",
      "visual-instance-missing"
    ]);
  });

  it("projects content and overlay updates through the same owner records", () => {
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });
    const contentPatch = createUpdatePatch({
      invalidatedProducts: ["layout", "content"],
      layoutDirtyRange: {
        reason: "content",
        changedRange: { from: 1, to: 4 },
        firstTopLevelBlockIndex: 0,
        firstTopLevelBlockRange: { from: 1, to: 5 }
      }
    });
    const overlayPatch = createUpdatePatch({
      invalidatedProducts: ["overlay"],
      causes: ["selection"]
    });

    const contentProjection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: contentPatch
    });
    const overlayProjection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: overlayPatch
    });

    expect(contentProjection.owners).toEqual([{
      ownerKey: ownerIndex.owners[0]!.key,
      lanes: ["content"]
    }]);
    expect(overlayProjection.owners).toHaveLength(ownerIndex.owners.length);
    expect(overlayProjection.owners.every((owner) => owner.lanes.length === 1 && owner.lanes[0] === "overlay")).toBe(true);
  });

  it("projects a dirty content owner together with its explicit retained ancestors", () => {
    const compiled = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });
    const parent = compiled.owners.find((owner) => owner.productId === "paragraph:first")!;
    const child = compiled.owners.find((owner) => owner.productId === "paragraph:second")!;
    const owners = [parent, { ...child, ancestorOwnerKeys: [parent.key] }];
    const ownerIndex = {
      owners,
      ownersByKey: Object.fromEntries(owners.map((owner) => [owner.key, owner])),
      ownerKeysByPageIndex: compiled.ownerKeysByPageIndex,
      gaps: []
    };
    const projection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: createUpdatePatch({
        invalidatedProducts: ["layout", "content"],
        layoutDirtyRange: {
          reason: "content",
          changedRange: { from: 6, to: 7 },
          firstTopLevelBlockIndex: 1,
          firstTopLevelBlockRange: { from: 5, to: 9 }
        }
      })
    });

    expect(projection.owners.map((owner) => owner.ownerKey))
      .toEqual([parent.key, child.key]);
  });

  it("escalates an unbounded content update instead of pretending it is local", () => {
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });
    const projection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: createUpdatePatch({ invalidatedProducts: ["content"] })
    });

    expect(projection.owners).toHaveLength(2);
    expect(projection.escalations).toEqual([{
      code: "missing-dirty-range",
      message: expect.stringContaining("no bounded dirty range")
    }]);
  });

  it("names broad paint dependency invalidation instead of reporting a dirty-range miss", () => {
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });
    const projection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: createUpdatePatch({
        causes: ["width-change"],
        invalidatedProducts: ["layout", "content", "viewport"]
      })
    });

    expect(projection.escalations).toEqual([{
      code: "broad-invalidation",
      message: expect.stringContaining("width-change")
    }]);
    expect(projection.refreshViewportMembership).toBe(true);
  });

  it("refreshes page chrome image pixels without invalidating layout", () => {
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({ snapshot: createDisplayOwnershipSnapshot() });
    const updatePatch = deriveQuireViewUpdatePatch({ reason: "image-paint" });
    const projection = createQuireDisplayInvalidationProjection({ ownerIndex, updatePatch });
    const chrome = ownerIndex.owners.find(owner => owner.kind === "page-chrome")!;
    expect(projection.owners.find(owner => owner.ownerKey === chrome.key)?.lanes).toContain("content");
    expect(updatePatch.invalidatedProducts).not.toContain("layout");
    expect(projection.escalations).toEqual([{
      code: "broad-invalidation", message: expect.stringContaining("image-paint")
    }]);
  });

  it("rebuilds only intersecting flow and object owners for floating placement", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const rootOwner = snapshot.root.layoutOwner!;
    const source = {
      sourceId: "source:floating:shape-1",
      range: { from: 2, to: 3 }
    };
    const region = {
      rootId: { value: "root:floating:shape-1" },
      regionId: { value: "region:floating:shape-1" },
      kind: "floating-object" as const,
      visualInstanceId: "floating-instance:0"
    };
    const snapshotWithFloatingOwner = {
      ...snapshot,
      layerContributions: [{
        contributionId: "floating:shape-1",
        owner: {
          root: {
            id: region.rootId,
            kind: "drawing" as const,
            source,
            capabilities: rootOwner.capabilities
          },
          region,
          source,
          capabilities: rootOwner.capabilities
        },
        range: source.range,
        rect: { x: 20, y: 20, width: 30, height: 20 },
        coordinateSpace: "document" as const,
        layer: { plane: "drawing" as const },
        paintSurface: "content" as const,
        commands: [],
        domOverlays: [],
        targets: []
      }]
    } as QuireLayoutSnapshot;
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: snapshotWithFloatingOwner
    });
    const projection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: createUpdatePatch({
        causes: ["floating-object-placement"],
        invalidatedProducts: ["layout", "content"],
        layoutDirtyRange: {
          reason: "floating-object-placement",
          changedRange: source.range,
          firstTopLevelBlockIndex: 0,
          firstTopLevelBlockRange: { from: 1, to: 5 },
          floatingObjectTarget: {
            objectId: "shape-1",
            drawingId: "shape-1:drawing",
            anchorPosition: 2,
            reason: "wrap-placement"
          }
        }
      })
    });
    const contentOwnerProducts = projection.owners
      .filter((entry) => entry.lanes.includes("content"))
      .map((entry) => ownerIndex.ownersByKey[entry.ownerKey]?.productId);

    expect(contentOwnerProducts).toEqual([
      "paragraph:first",
      resolveQuireLayerContributionProductId(snapshotWithFloatingOwner.layerContributions![0]!)
    ]);
    expect(projection.escalations).toEqual([]);
  });

  it("surfaces floating relocation identity gaps alongside broad refresh", () => {
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });
    const projection = createQuireDisplayInvalidationProjection({
      ownerIndex,
      updatePatch: createUpdatePatch({
        causes: ["fallback"],
        invalidatedProducts: ["layout", "content"],
        layoutDirtyRange: {
          reason: "fallback",
          changedRange: { from: 2, to: 7 },
          firstTopLevelBlockIndex: 0,
          firstTopLevelBlockRange: { from: 1, to: 5 },
          identityGaps: [{
            code: "floating-object-relocation-unresolved",
            message: "Floating-object relocation does not yet prove both mapped flow-owner dependencies."
          }]
        }
      })
    });

    expect(projection.escalations).toEqual([
      {
        code: "broad-invalidation",
        message: expect.stringContaining("fallback")
      },
      {
        code: "invalidation-identity-gap",
        message: expect.stringContaining("floating-object-relocation-unresolved")
      }
    ]);
  });

  it("accepts commands only from an exact product and paint-scope owner", () => {
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: createDisplayOwnershipSnapshot()
    });
    const collector = createQuireRetainedDisplayOwnerChunkCollector(ownerIndex);
    const command = {
      id: "paragraph:first:text",
      kind: "text" as const,
      rect: { x: 0, y: 0, width: 20, height: 20 },
      text: "first",
      origin: { x: 0, y: 16 },
      font: "16px sans-serif",
      fillStyle: "#111"
    };

    collector.append({
      productId: "paragraph:first",
      paintScope: "layout-content",
      paintOrder: 100,
      commands: [command]
    });
    collector.append({
      productId: "page:0",
      paintScope: "page-chrome",
      paintOrder: 0,
      commands: [command]
    });
    const chunks = collector.finish({ x: 0, y: 0, width: 100, height: 200 });

    expect(chunks.chunks).toHaveLength(ownerIndex.owners.length);
    const paragraphOwner = ownerIndex.owners.find(
      (owner) => owner.productId === "paragraph:first"
    );
    const pageChromeOwner = ownerIndex.owners.find(
      (owner) => owner.paintScope === "page-chrome"
    );
    expect(chunks.chunksByOwnerKey[paragraphOwner!.key]?.contentDisplayList.commands)
      .toEqual([command]);
    expect(chunks.chunksByOwnerKey[paragraphOwner!.key]?.overlayDisplayList.commands)
      .toEqual([]);
    expect(chunks.chunksByOwnerKey[pageChromeOwner!.key]?.contentDisplayList.commands)
      .toEqual([]);
  });

  it("compiles exact retained layer contributions into their declared paint scopes", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const rootOwner = snapshot.root.layoutOwner!;
    const contentCommand = {
      id: "provider-content",
      kind: "fill-rect" as const,
      rect: { x: 5, y: 5, width: 10, height: 10 },
      fillStyle: "#111"
    };
    const overlayCommand = {
      ...contentCommand,
      id: "provider-overlay",
      layer: "overlay" as const
    };
    const snapshotWithContributions = {
      ...snapshot,
      layerContributions: [
        {
          contributionId: "provider:content",
          owner: {
            root: {
              id: rootOwner.region.rootId,
              kind: "document" as const,
              source: rootOwner.source,
              capabilities: rootOwner.capabilities
            },
            region: rootOwner.region,
            source: rootOwner.source,
            capabilities: rootOwner.capabilities
          },
          range: { from: 1, to: 2 },
          rect: contentCommand.rect,
          coordinateSpace: "document" as const,
          layer: { plane: "content" as const },
          paintSurface: "content" as const,
          commands: [contentCommand],
          domOverlays: [],
          targets: []
        },
        {
          contributionId: "provider:overlay",
          owner: {
            root: {
              id: rootOwner.region.rootId,
              kind: "document" as const,
              source: rootOwner.source,
              capabilities: rootOwner.capabilities
            },
            region: rootOwner.region,
            source: rootOwner.source,
            capabilities: rootOwner.capabilities
          },
          range: { from: 2, to: 3 },
          rect: overlayCommand.rect,
          coordinateSpace: "document" as const,
          layer: { plane: "annotation" as const },
          paintSurface: "overlay" as const,
          commands: [overlayCommand],
          domOverlays: [],
          targets: []
        }
      ]
    } as QuireLayoutSnapshot;

    const index = createQuireRetainedDisplayOwnerIndex({
      snapshot: snapshotWithContributions
    });

    const [contentContribution, overlayContribution] = snapshotWithContributions.layerContributions!;
    expect(index.owners.map((owner) => [owner.productId, owner.paintScope]))
      .toEqual(expect.arrayContaining([
        [resolveQuireLayerContributionProductId(contentContribution!), "layer-content"],
        [resolveQuireLayerContributionProductId(overlayContribution!), "layer-overlay"]
      ]));
  });

  it("keeps same-id contributions of different provider occurrences on their own owners", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const rootOwner = snapshot.root.layoutOwner!;
    const occurrence = (index: number) => {
      const region = { ...rootOwner.region, rootId: { value: `root:preview:${index}` }, regionId: { value: `region:preview:${index}` } };
      const source = { ...rootOwner.source, sourceId: `preview-node:${index}` };
      return {
        contributionId: "preview",
        owner: { root: { id: region.rootId, kind: "document" as const, source, capabilities: rootOwner.capabilities },
          region, source, capabilities: rootOwner.capabilities },
        range: { from: index, to: index + 1 },
        rect: { x: 0, y: index * 50, width: 40, height: 40 },
        coordinateSpace: "document" as const,
        layer: { plane: "content" as const },
        paintSurface: "content" as const,
        commands: [],
        domOverlays: [],
        targets: []
      };
    };
    const contributions = [occurrence(1), occurrence(2)];
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: { ...snapshot, layerContributions: contributions } as QuireLayoutSnapshot
    });
    const collector = createQuireRetainedDisplayOwnerChunkCollector(ownerIndex);
    const commands = contributions.map((contribution, index) => ({
      id: `image-${index}`, kind: "fill-rect" as const, rect: contribution.rect, fillStyle: "#000"
    }));
    contributions.forEach((contribution, index) => collector.append({
      productId: resolveQuireLayerContributionProductId(contribution),
      paintScope: "layer-content",
      paintOrder: 0,
      commands: [commands[index]!]
    }));
    const chunks = collector.finish(snapshot.documentRect);
    const owners = ownerIndex.owners.filter((owner) => owner.kind === "layer-contribution");

    expect(owners).toHaveLength(2);
    expect(owners.map((owner) => chunks.chunksByOwnerKey[owner.key]?.contentDisplayList.commands))
      .toEqual([[commands[0]], [commands[1]]]);
  });

  it("routes page chrome and retained contributions into exact owner lanes", () => {
    const snapshot = createDisplayOwnershipSnapshot();
    const rootOwner = snapshot.root.layoutOwner!;
    const snapshotWithContribution = {
      ...snapshot,
      layerContributions: [{
        contributionId: "provider:overlay",
        owner: {
          root: {
            id: rootOwner.region.rootId,
            kind: "document" as const,
            source: rootOwner.source,
            capabilities: rootOwner.capabilities
          },
          region: rootOwner.region,
          source: rootOwner.source,
          capabilities: rootOwner.capabilities
        },
        range: { from: 2, to: 3 },
        rect: { x: 5, y: 5, width: 10, height: 10 },
        coordinateSpace: "document" as const,
        layer: { plane: "annotation" as const },
        paintSurface: "overlay" as const,
        commands: [],
        domOverlays: [],
        targets: []
      }]
    } as QuireLayoutSnapshot;
    const ownerIndex = createQuireRetainedDisplayOwnerIndex({
      snapshot: snapshotWithContribution
    });
    const collector = createQuireRetainedDisplayOwnerChunkCollector(ownerIndex);
    const pageCommand = {
      id: "page-0:background",
      kind: "fill-rect" as const,
      rect: { x: 0, y: 0, width: 100, height: 100 },
      fillStyle: "#fff"
    };
    const overlayCommand = {
      ...pageCommand,
      id: "provider-overlay",
      layer: "overlay" as const
    };

    collector.append({
      productId: "page-chrome",
      paintScope: "page-chrome",
      paintOrder: 0,
      commands: [pageCommand]
    });
    collector.append({
      productId: resolveQuireLayerContributionProductId(snapshotWithContribution.layerContributions![0]!),
      paintScope: "layer-overlay",
      paintOrder: 300,
      commands: [overlayCommand]
    });
    const chunks = collector.finish(snapshot.documentRect);
    const pageOwner = ownerIndex.owners.find((owner) => owner.paintScope === "page-chrome")!;
    const overlayOwner = ownerIndex.owners.find((owner) => owner.paintScope === "layer-overlay")!;

    expect(chunks.chunksByOwnerKey[pageOwner.key]?.contentDisplayList.commands)
      .toEqual([pageCommand]);
    expect(chunks.chunksByOwnerKey[overlayOwner.key]?.overlayDisplayList.commands)
      .toEqual([overlayCommand]);
    expect(createQuireRetainedDisplayOwnerDiagnostics({
      ownerIndex,
      ownerChunkCount: chunks.chunks.length,
      invalidation: createQuireDisplayInvalidationProjection({ ownerIndex }),
      observerBridgeUses: 0
    })).toEqual(expect.objectContaining({
      compiledOwners: ownerIndex.owners.length,
      directOwnerChunks: chunks.chunks.length,
      observerBridgeUses: 0
    }));
  });
});

/**
 * Creates a two-page snapshot with repeated body regions and explicit owners.
 *
 * @returns Minimal retained layout fixture used by display-owner tests.
 */
function createDisplayOwnershipSnapshot(): QuireLayoutSnapshot {
  const bodyCapabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  } as const;
  const rootOwner = {
    region: {
      rootId: { value: "root:document" },
      regionId: { value: "region:body" },
      kind: "body" as const
    },
    source: { sourceId: "source:document", range: { from: 0, to: 9 } },
    capabilities: bodyCapabilities
  };
  const firstOwner = {
    region: {
      ...rootOwner.region,
      visualInstanceId: "body-instance:0"
    },
    source: { sourceId: "source:paragraph:first", range: { from: 1, to: 5 } },
    capabilities: bodyCapabilities
  };
  const secondOwner = {
    region: {
      ...rootOwner.region,
      visualInstanceId: "body-instance:1"
    },
    source: { sourceId: "source:paragraph:second", range: { from: 5, to: 9 } },
    capabilities: bodyCapabilities
  };

  return {
    state: {} as QuireLayoutSnapshot["state"],
    root: {
      id: "document",
      kind: "block",
      range: { from: 0, to: 9 },
      rect: { x: 0, y: 0, width: 100, height: 200 },
      layoutOwner: rootOwner,
      children: [
        {
          id: "paragraph:first",
          kind: "block",
          range: { from: 1, to: 5 },
          rect: { x: 0, y: 0, width: 100, height: 40 },
          layoutOwner: firstOwner
        },
        {
          id: "paragraph:second",
          kind: "block",
          range: { from: 5, to: 9 },
          rect: { x: 0, y: 120, width: 100, height: 40 },
          layoutOwner: secondOwner
        }
      ]
    },
    documentRect: { x: 0, y: 0, width: 100, height: 200 },
    viewportRect: { x: 0, y: 0, width: 100, height: 200 },
    domOverlays: [],
    hitTargets: [],
    pages: [
      {
        pageIndex: 0,
        range: { from: 0, to: 5 },
        pageRect: { x: 0, y: 0, width: 100, height: 100 },
        bodyRect: { x: 0, y: 0, width: 100, height: 100 }
      },
      {
        pageIndex: 1,
        range: { from: 5, to: 9 },
        pageRect: { x: 0, y: 100, width: 100, height: 100 },
        bodyRect: { x: 0, y: 100, width: 100, height: 100 }
      }
    ]
  };
}

/**
 * Creates a typed update patch with stable defaults for owner-projection tests.
 *
 * @param overrides - Patch fields specific to one invalidation scenario.
 * @returns Complete mounted-view update patch.
 */
function createUpdatePatch(
  overrides: Partial<QuireViewUpdatePatch>
): QuireViewUpdatePatch {
  return {
    transactionCount: 1,
    docChanged: false,
    selectionChanged: false,
    compositionChanged: false,
    causes: [],
    invalidatedProducts: [],
    ...overrides
  };
}
