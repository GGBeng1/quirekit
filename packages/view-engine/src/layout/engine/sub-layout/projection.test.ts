import {
  createQuireChildFlowContinuation,
  createQuireChildFlowResult,
  type QuireChildFlowRoot
} from "@quirekit/layout/child-flow";
import type { QuireLayoutBox } from "../types";
import { describe, expect, it } from "vitest";
import { createQuireSubLayoutProjection } from "./projection";

describe("sub-layout View projection contract", () => {
  it("attaches shared query and retained display products to canonical geometry", () => {
    const geometry = createQuireChildFlowResult({
      id: "cell-a:fragment-0",
      trackId: "page:0",
      root: createRoot(),
      acceptedBand: { top: 0, bottom: 48 },
      fragments: [{
        id: "cell-a:paragraph-0",
        sourceId: "paragraph-0",
        range: { from: 2, to: 6 },
        rect: { x: 20, y: 30, width: 80, height: 24 },
        localRect: { x: 0, y: 0, width: 80, height: 24 }
      }],
      localToResult: { x: 20, y: 30 },
      coordinateSpace: "document",
      contentClip: { x: 20, y: 30, width: 80, height: 48 },
      interactionClip: { x: 20, y: 30, width: 80, height: 48 },
      continuation: null,
      dependencySignature: "width:80|style:v1",
      dependencyCheckpoints: { line: 1 }
    });
    const queryProducts = {
      selectionRects: [{
        textFragmentId: "paragraph-text",
        range: { from: 2, to: 6 },
        rect: { x: 20, y: 30, width: 40, height: 24 }
      }],
      caretStops: [{
        textFragmentId: "paragraph-text",
        position: { pos: 2, bias: 1 as const },
        rect: { x: 20, y: 30, width: 1, height: 24 },
        fragmentId: "cell-a:paragraph-0"
      }],
      hitTargets: [{
        id: "cell-a-hit",
        range: { from: 2, to: 6 },
        rect: { x: 20, y: 30, width: 80, height: 24 }
      }],
      inputAnchors: [{
        position: { pos: 2, bias: 1 as const },
        rect: { x: 20, y: 30, width: 1, height: 24 },
        role: "caret" as const
      }]
    };
    const projection = createQuireSubLayoutProjection({
      geometry,
      root: { ownership: { status: "unclaimed" } },
      fragmentSources: [{
        fragmentId: "cell-a:paragraph-0",
        sourceBox: createSourceBox()
      }],
      queryProducts
    });

    expect(projection.view.queryProducts).toBe(queryProducts);
    expect(projection.view.queryProducts.caretStops[0]?.rect)
      .toEqual(projection.view.queryProducts.inputAnchors[0]?.rect);
    expect(projection.view.displayChunks[0]).toMatchObject({
      kind: "sub-layout-local",
      key: "cell-a:fragment-0:display",
      rect: geometry.contentClip,
      dependencySignature: geometry.dependencySignature,
      sourceBoxIds: ["cell-a:paragraph-0:source"],
      queryOwner: {
        sourceRootId: geometry.root.id,
        sourceFragmentId: geometry.id,
        coordinateSpace: "document",
        sourceCoordinateSpace: "table-cell-local"
      }
    });
  });

  it("preserves canonical continuation identity without View-specific aliases", () => {
    const root = createRoot();
    const acceptedBand = { top: 0, bottom: 24 };
    const continuation = createQuireChildFlowContinuation({
      root,
      acceptedBand,
      previousResultId: "cell-a:fragment-0",
      pageIndex: 0,
      adapterState: { adapter: "table-cell" }
    });
    const geometry = createQuireChildFlowResult({
      id: "cell-a:fragment-0",
      trackId: "page:0",
      root,
      acceptedBand,
      fragments: [],
      localToResult: { x: 20, y: 30 },
      coordinateSpace: "document",
      contentClip: { x: 20, y: 30, width: 80, height: 24 },
      interactionClip: { x: 20, y: 30, width: 80, height: 24 },
      continuation,
      dependencySignature: root.dependencySignature
    });
    const projection = createQuireSubLayoutProjection({
      geometry,
      root: { ownership: { status: "unclaimed" } },
      queryProducts: createEmptyQueryProducts()
    });

    expect(projection.geometry.continuation).toMatchObject({
      rootId: root.id,
      previousResultId: geometry.id,
      pageIndex: 0,
      adapterState: { adapter: "table-cell" }
    });
    expect(projection.view.displayChunks[0]).toMatchObject({ pageIndex: 0 });
  });

  it("keeps absent retained ownership explicit instead of inventing defaults", () => {
    const geometry = createQuireChildFlowResult({
      id: "cell-a:fragment-0",
      trackId: "page:0",
      root: createRoot(),
      acceptedBand: { top: 0, bottom: 40 },
      fragments: [],
      localToResult: { x: 20, y: 30 },
      coordinateSpace: "document",
      contentClip: { x: 20, y: 30, width: 80, height: 40 },
      interactionClip: { x: 20, y: 30, width: 80, height: 40 },
      continuation: null,
      dependencySignature: "width:80|style:v1"
    });
    const projection = createQuireSubLayoutProjection({
      geometry,
      root: { ownership: { status: "unclaimed" } },
      queryProducts: createEmptyQueryProducts()
    });

    expect(projection.view.root.ownership).toEqual({ status: "unclaimed" });
    expect(projection.view.displayChunks[0]?.queryOwner).not.toHaveProperty("root");
    expect(projection.view.displayChunks[0]?.queryOwner).not.toHaveProperty("region");
  });
});

/**
 * Creates a table-cell-like child-flow root for projection contract tests.
 *
 * @returns Consumer-neutral recursive child-flow root.
 */
function createRoot(): QuireChildFlowRoot {
  return {
    id: "table-cell:cell-a",
    kind: "table-cell",
    range: { from: 1, to: 8 },
    placement: {
      parentId: "table-row-0",
      rect: { x: 10, y: 20, width: 100, height: 60 },
      contentRect: { x: 20, y: 30, width: 80, height: 40 }
    },
    localRect: { x: 0, y: 0, width: 80, height: 40 },
    writingMode: "horizontal-tb",
    dependencySignature: "width:80|style:v1"
  };
}

/**
 * Creates the projected source layout box bound to the retained display chunk.
 *
 * @returns Source layout box with stable paint provenance.
 */
function createSourceBox(): QuireLayoutBox {
  return {
    id: "cell-a:paragraph-0:source",
    range: { from: 2, to: 6 },
    rect: { x: 20, y: 30, width: 80, height: 24 }
  };
}

/**
 * Creates empty query products for geometry-focused projection fixtures.
 *
 * @returns Empty View interaction products.
 */
function createEmptyQueryProducts() {
  return {
    selectionRects: [],
    caretStops: [],
    hitTargets: [],
    inputAnchors: []
  };
}
