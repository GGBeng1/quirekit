import { describe, expect, it } from "vitest";
import {
  createQuireDefaultViewCapabilities,
  createQuireDefaultViewRegion,
  createQuireDefaultViewRoot
} from "../../../view-graph";
import type { QuireSubLayoutProjection } from "../../sub-layout";
import { createQuireTestSubLayoutProjection } from "../../../../../test-support/layout/sub-layout-projection";
import { projectQuireSubLayoutProjectionVisualInstance } from "./sub-layout-visual-instance";

describe("sub-layout visual-instance projection", () => {
  it("projects retained products into the concrete fragment occurrence", () => {
    const capabilities = createQuireDefaultViewCapabilities();
    const viewRoot = createQuireDefaultViewRoot({
      rootId: "root:cell-a",
      kind: "table-cell",
      sourceId: "cell-a",
      range: { from: 2, to: 8 },
      capabilities
    });
    const sourceRegion = {
      ...createQuireDefaultViewRegion({
        rootId: viewRoot.id,
        regionId: "region:cell-a",
        kind: "table-cell"
      }),
      visualInstanceId: "single-page"
    };
    const sourceRect = { x: 20, y: 40, width: 120, height: 24 };
    const result: QuireSubLayoutProjection = createQuireTestSubLayoutProjection({
      root: {
        id: "cell-a:sub-layout-root",
        kind: "table-cell",
        range: { from: 2, to: 8 },
        placement: {
          parentId: "table#p15",
          rect: sourceRect,
          contentRect: sourceRect
        },
        localRect: { x: 0, y: 0, width: 120, height: 24 },
        writingMode: "horizontal-tb",
        dependencySignature: "cell-a:120"
      },
      resultId: "cell-a:sub-layout-root:table#p15:source-flow:0-24",
      acceptedBand: { top: 0, bottom: 24 },
      localToResult: { x: 20, y: 40 },
      contentClip: sourceRect,
      interactionClip: sourceRect,
      viewRoot: {
        ownership: {
          status: "resolved",
          root: viewRoot,
          owner: {
            region: sourceRegion,
            source: viewRoot.source,
            capabilities
          },
          regionProducts: {
          roots: [viewRoot],
          regions: [{
            ref: sourceRegion,
            source: viewRoot.source,
            rect: sourceRect,
            coordinateSpace: "document",
            capabilities
          }],
          hitTargets: [{
            id: "cell-a:hit",
            range: { from: 2, to: 8 },
            rect: sourceRect,
            viewRegion: sourceRegion
          }],
          layerContributions: [],
          selectionPolicies: [{
            policyId: "cell-a:selection",
            region: sourceRegion,
            kind: "delegate-to-text"
          }],
            gaps: []
          }
        }
      }
    });

    const projected = projectQuireSubLayoutProjectionVisualInstance(result);
    const projectedOwnership = projected.view.root.ownership;

    expect(projectedOwnership.status).toBe("resolved");
    if (projectedOwnership.status !== "resolved") {
      throw new Error("Expected resolved visual-instance ownership.");
    }
    expect(projectedOwnership.owner.region.visualInstanceId)
      .toBe(result.geometry.id);
    expect(projectedOwnership.regionProducts?.regions[0]?.ref.visualInstanceId)
      .toBe(result.geometry.id);
    expect(projectedOwnership.regionProducts?.hitTargets[0]?.viewRegion?.visualInstanceId)
      .toBe(result.geometry.id);
    expect(projectedOwnership.regionProducts?.selectionPolicies[0]?.region.visualInstanceId)
      .toBe(result.geometry.id);
  });
});
