import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutBox, QuireLayoutContainer } from "../../types";
import type { QuireTableCellSubLayoutRoot } from "./types";
import {
  createQuireTableCellSourceSubLayoutProjection,
  createQuireTableCellSourceSubLayoutProjectionMap
} from "./source-result";

describe("table-cell source sub-layout result adapter", () => {
  it("exposes nested source-flow child fragments through the result", () => {
    const textFragment = createTextFragment();
    const sourceBox = createContainer("cell-a", [
      createBox("paragraph-a", [textFragment])
    ]);
    const root = createRoot(sourceBox);
    const result = createQuireTableCellSourceSubLayoutProjection({ root });

    expect(result.geometry).toMatchObject({
      root: root.geometry,
      id: "table-cell:semantic-a:explicit-a:table-0:source-flow:30-70",
      acceptedBand: { top: 30, bottom: 70 },
      localToResult: { x: 0, y: 0 },
      contentClip: { x: 20, y: 30, width: 80, height: 40 },
      interactionClip: { x: 20, y: 30, width: 80, height: 40 },
      continuation: null,
      dependencySignature: "cell-width:80|style:v1"
    });
    expect(result.view.queryProducts).toEqual({
        selectionRects: [],
        caretStops: [],
        hitTargets: [],
      inputAnchors: []
    });
    expect(result.geometry.fragments.map((fragment) => fragment.id)).toEqual([
      "cell-a",
      "paragraph-a"
    ]);
    expect(result.geometry.fragments[1]).toMatchObject({
      id: "paragraph-a",
      sourceId: "paragraph-a",
      range: { from: 5, to: 11 },
      rect: { x: 24, y: 38, width: 64, height: 12 },
      localRect: { x: 24, y: 38, width: 64, height: 12 },
      textFragments: [textFragment]
    });
    expect(result.view.fragmentSources[1]?.sourceBox).toMatchObject({
      id: "paragraph-a"
    });
  });

  it("keeps source-flow result maps keyed by table-cell fragment id", () => {
    const sourceBox = createContainer("cell-a", []);
    const root = createRoot(sourceBox);
    const resultByCellId = createQuireTableCellSourceSubLayoutProjectionMap({
      subLayoutRootByCellId: new Map([["cell-a#p0", root]])
    });

    expect(resultByCellId.get("cell-a#p0")?.geometry.root).toBe(root.geometry);
    expect(resultByCellId.get("cell-a#p0")?.view.fragmentSources[0]?.sourceBox)
      .toBe(sourceBox);
  });
});

/**
 * Creates a table-cell-like sub-layout root fixture.
 *
 * @param sourceBox - Source child-flow box owned by the root.
 * @returns Sub-layout root fixture.
 */
function createRoot(sourceBox: QuireLayoutBox): QuireTableCellSubLayoutRoot {
  return {
    geometry: {
      id: "table-cell:semantic-a:explicit-a",
      kind: "table-cell",
      range: { from: 4, to: 12 },
      placement: {
        parentId: "table-0",
        rect: { x: 10, y: 20, width: 100, height: 60 },
        contentRect: { x: 20, y: 30, width: 80, height: 40 }
      },
      localRect: { x: 20, y: 30, width: 80, height: 40 },
      writingMode: "horizontal-tb",
      dependencySignature: "cell-width:80|style:v1",
      metadata: {
        tableCell: {
          cellId: "cell-a",
          semanticCellId: "semantic-a",
          originExplicitCellId: "explicit-a"
        }
      }
    },
    view: { ownership: { status: "unclaimed" }, sourceBox }
  };
}

/**
 * Creates a layout-container fixture.
 *
 * @param id - Stable container id.
 * @param children - Child boxes owned by the container.
 * @returns Layout-container fixture.
 */
function createContainer(
  id: string,
  children: readonly QuireLayoutBox[]
): QuireLayoutContainer {
  return {
    id,
    range: { from: 4, to: 12 },
    rect: { x: 20, y: 30, width: 80, height: 40 },
    children
  };
}

/**
 * Creates a leaf layout box fixture.
 *
 * @param id - Stable box id.
 * @param textFragments - Text fragments owned by the box.
 * @returns Leaf layout box fixture.
 */
function createBox(
  id: string,
  textFragments: readonly QuireTextFragment[]
): QuireLayoutBox {
  return {
    id,
    range: { from: 5, to: 11 },
    rect: { x: 24, y: 38, width: 64, height: 12 },
    textFragments
  };
}

/**
 * Creates a text fragment fixture.
 *
 * @returns Text fragment fixture.
 */
function createTextFragment(): QuireTextFragment {
  return {
    id: "line-a",
    text: "hello",
    range: { from: 5, to: 10 },
    rect: { x: 24, y: 38, width: 40, height: 10 },
    font: "16px sans-serif",
    lineHeight: 12,
    baseline: 47,
    caretStops: []
  };
}
