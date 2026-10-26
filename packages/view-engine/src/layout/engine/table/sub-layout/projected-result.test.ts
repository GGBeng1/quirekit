import { describe, expect, it } from "vitest";
import type { QuireLayoutBox } from "../../types";
import type { QuireTableCellSubLayoutRoot } from "./types";
import {
  createQuireProjectedTableCellSubLayoutProjection
} from "./projected-result";

describe("createQuireProjectedTableCellSubLayoutProjection", () => {
  it("creates projected child fragments and query products from one path", () => {
    const root = createRoot();
    const child = createChild();
    const result = createQuireProjectedTableCellSubLayoutProjection({
      root,
      sourceChildId: "cell-a",
      acceptedBand: { top: 100, bottom: 140 },
      children: [child],
      localToResult: { x: 10, y: 80 },
      contentClip: { x: 20, y: 100, width: 80, height: 40 },
      interactionClip: { x: 20, y: 100, width: 80, height: 60 }
    });

    expect(result.geometry.id).toBe(
      "table-cell:semantic-a:explicit-a:table-0:source-flow:100-140"
    );
    expect(result.geometry.fragments).toEqual([
      expect.objectContaining({
        id: "paragraph-a",
        sourceId: "cell-a",
        rect: child.rect,
        localRect: { x: 12, y: 24, width: 40, height: 16 }
      })
    ]);
    expect(result.view.fragmentSources).toEqual([
      { fragmentId: "paragraph-a", sourceBox: child }
    ]);
    expect(result.view.queryProducts.hitTargets).toEqual([
      {
        id: "paragraph-a:sub-layout-hit",
        range: child.range,
        rect: child.rect
      },
      {
        id: "paragraph-a:sub-layout-trailing-blank-hit",
        range: child.range,
        rect: { x: 20, y: 104, width: 80, height: 56 }
      }
    ]);
    expect(result.geometry.continuation).toBe(null);
  });

  it("creates generic source-flow continuation for partial table-cell slices", () => {
    const root = createRoot();
    const result = createQuireProjectedTableCellSubLayoutProjection({
      root,
      sourceChildId: "cell-a",
      acceptedBand: { top: 100, bottom: 124 },
      children: [createChild()],
      localToResult: { x: 10, y: 80 },
      contentClip: { x: 20, y: 100, width: 80, height: 24 },
      pageIndex: 2,
      adapterState: {
        projectionKind: "table-body-cell"
      }
    });

    expect(result.geometry.continuation).toEqual({
      rootId: root.geometry.id,
      range: root.geometry.range,
      nextSourceFlowY: 124,
      previousAcceptedBand: { top: 100, bottom: 124 },
      remainingSourceFlowBand: { top: 124, bottom: 140 },
      pageIndex: 2,
      parentFragmentId: "table-0",
      previousResultId: "table-cell:semantic-a:explicit-a:table-0:source-flow:100-124",
      adapterState: {
        sourceChildId: "cell-a",
        projectionKind: "table-body-cell"
      },
      dependencySignature: root.geometry.dependencySignature
    });
  });
});

/**
 * Creates a table-cell-like sub-layout root fixture.
 *
 * @returns Sub-layout root fixture.
 */
function createRoot(): QuireTableCellSubLayoutRoot {
  return {
    geometry: {
      id: "table-cell:semantic-a:explicit-a",
      kind: "table-cell",
      range: { from: 4, to: 12 },
      placement: {
        parentId: "table-0",
        rect: { x: 10, y: 90, width: 100, height: 70 },
        contentRect: { x: 20, y: 100, width: 80, height: 40 }
      },
      localRect: { x: 20, y: 100, width: 80, height: 40 },
      writingMode: "horizontal-tb",
      dependencySignature: "cell-width:80|style:v1"
    },
    view: { ownership: { status: "unclaimed" } }
  };
}

/**
 * Creates a projected child layout box fixture.
 *
 * @returns Layout box fixture.
 */
function createChild(): QuireLayoutBox {
  return {
    id: "paragraph-a",
    range: { from: 5, to: 11 },
    rect: { x: 22, y: 104, width: 40, height: 16 },
    textFragments: []
  };
}
