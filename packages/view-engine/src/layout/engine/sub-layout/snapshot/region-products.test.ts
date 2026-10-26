import { describe, expect, it } from "vitest";
import {
  createQuireDefaultViewCapabilities,
  createQuireDefaultViewRegion,
  createQuireDefaultViewRoot
} from "../../../view-graph";
import type { QuireRetainedRegionProducts } from "../../../region-products";
import type { QuireLayoutBox } from "../../types";
import type { QuireLayoutBoxSubLayoutFragment } from "../types";
import { createQuireTestSubLayoutProjection } from "../../../../../test-support/layout/sub-layout-projection";
import { collectQuireSubLayoutRegionProductsForSnapshot } from "./region-products";

describe("sub-layout retained region products", () => {
  it("collects only canonical products already owned by visible roots", () => {
    const capabilities = createQuireDefaultViewCapabilities();
    const root = createQuireDefaultViewRoot({
      rootId: "root:cell-a",
      kind: "table-cell",
      sourceId: "cell-a",
      range: { from: 2, to: 8 },
      capabilities
    });
    const regionRef = createQuireDefaultViewRegion({
      rootId: root.id,
      regionId: "region:cell-a",
      kind: "table-cell"
    });
    const interactionClip = { x: 16, y: 36, width: 128, height: 32 };
    const products: QuireRetainedRegionProducts = {
      roots: [root],
      regions: [{
        ref: regionRef,
        source: { sourceId: "cell-a", range: { from: 2, to: 8 } },
        rect: interactionClip,
        coordinateSpace: "document",
        capabilities
      }],
      hitTargets: [],
      layerContributions: [],
      selectionPolicies: [],
      gaps: []
    };
    const result = createQuireTestSubLayoutProjection({
      root: {
        id: "cell-a",
        kind: "table-cell",
        range: { from: 2, to: 8 },
        placement: {
          parentId: "table:page:4",
          rect: interactionClip,
          contentRect: { x: 20, y: 40, width: 120, height: 24 }
        },
        localRect: { x: 0, y: 0, width: 120, height: 24 },
        writingMode: "horizontal-tb",
        dependencySignature: "cell-a:120"
      },
      resultId: "cell-a#page:4",
      acceptedBand: { top: 0, bottom: 24 },
      localToResult: { x: 20, y: 40 },
      contentClip: { x: 20, y: 40, width: 120, height: 24 },
      interactionClip,
      viewRoot: {
        ownership: {
          status: "resolved",
          root,
          owner: {
            region: regionRef,
            source: root.source,
            capabilities
          },
          regionProducts: products
        }
      },
      dependencySignature: "cell-a:120"
    });
    const box = {
      id: "table:page:4",
      range: { from: 0, to: 10 },
      rect: { x: 0, y: 0, width: 200, height: 100 },
      subLayoutFragments: [{ subLayout: result }]
    } as QuireLayoutBox & {
      readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
    };

    const collected = collectQuireSubLayoutRegionProductsForSnapshot(
      box,
      [interactionClip],
      (rect, clips) => clips?.some((clip) =>
        rect.x < clip.x + clip.width
        && rect.x + rect.width > clip.x
        && rect.y < clip.y + clip.height
        && rect.y + rect.height > clip.y
      ) ?? true
    );

    expect(collected).toEqual(products);
    expect(collected?.roots[0]).toBe(root);
    expect(collected?.regions[0]?.ref).toBe(regionRef);
  });
});
