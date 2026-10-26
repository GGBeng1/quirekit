import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { intersectQuireRects, type QuireRect } from "@quirekit/renderer";
import { createQuireSubLayoutProjection } from "./projection";
import { createQuireSubLayoutQueryProducts } from "./query-products";
import { adaptQuireSubLayoutQueryProductsForSnapshot } from "./snapshot/query";
import type { QuireSubLayoutProjection } from "./types";
import { projectQuireSubLayoutQueryProductsToPage } from "../pagination/projection/split-box/sub-layout/products";
import { translateQuireSubLayoutQueryProducts } from "../pagination/projection/translate/sub-layout/products";

describe("text query product projection", () => {
  it("binds a line rectangle and every run caret to the accepted text fragment", () => {
    const products = createTextProjection().view.queryProducts;

    expect(products.selectionRects).toEqual([{
      textFragmentId: "text-run",
      range: { from: 4, to: 8 },
      rect: { x: 20, y: 29, width: 40, height: 16 }
    }]);
    expect(products.caretStops).toEqual([4, 6, 8].map((pos, index) => ({
      textFragmentId: "text-run",
      fragmentId: "child-flow-fragment",
      position: { pos },
      rect: { x: 20 + index * 20, y: 31, width: 1, height: 13 },
      lineBaseline: 41
    })));
  });

  it("retains text identity and baseline through ordinary translation", () => {
    const projected = translateQuireSubLayoutQueryProducts(
      createTextProjection().view.queryProducts,
      { dx: 100, dy: 200 }
    );

    expect(projected.selectionRects[0]).toMatchObject({
      textFragmentId: "text-run",
      rect: { x: 120, y: 229, width: 40, height: 16 }
    });
    expect(projected.caretStops[1]).toMatchObject({
      textFragmentId: "text-run",
      rect: { x: 140, y: 231, width: 1, height: 13 },
      lineBaseline: 241
    });
  });

  it("keeps all text endpoints when a page exposes only the line leading", () => {
    const source = createTextProjection();
    const clip = { x: 30, y: 29, width: 20, height: 1 };
    const projected = projectQuireSubLayoutQueryProductsToPage(source, clip, {
      dx: 100,
      dy: 200,
      page: {
        pageIndex: 1,
        range: { from: 3, to: 9 },
        pageRect: clip,
        bodyRect: clip,
        rect: clip,
        endInfo: { openMarks: [], openNodes: [] }
      }
    }, "page-occurrence");

    expect(projected.selectionRects).toEqual([{
      textFragmentId: "text-run",
      range: { from: 4, to: 8 },
      rect: { x: 130, y: 229, width: 20, height: 1 }
    }]);
    expect(projected.caretStops).toHaveLength(3);
    expect(projected.caretStops[1]).toMatchObject({
      textFragmentId: "text-run",
      fragmentId: "child-flow-fragment:page:1",
      position: { pos: 6 },
      rect: { x: 140, y: 231, width: 1, height: 13 },
      lineBaseline: 241
    });
  });

  it("keeps complete text endpoints for a snapshot clipped to line leading", () => {
    const source = createTextProjection();
    const products = adaptQuireSubLayoutQueryProductsForSnapshot({
      id: "root",
      range: { from: 3, to: 9 },
      rect: source.geometry.contentClip,
      subLayoutFragments: [{ subLayout: source }]
    }, [{ x: 30, y: 29, width: 20, height: 1 }], intersectsAnyClip);

    expect(products?.selectionRects[0]).toHaveProperty("textFragmentId", "text-run");
    expect(products?.caretStops).toHaveLength(3);
    expect(products?.caretStops.every((stop) =>
      stop.queryOwner?.sourceFragmentId === "flow-occurrence"
    )).toBe(true);
  });

  it("retains an empty text line and its caret through a visible page clip", () => {
    const source = createTextProjection({
      text: "",
      range: { from: 4, to: 4 },
      rect: { x: 20, y: 29, width: 0, height: 16 },
      caretStops: [{ position: { pos: 4 }, localX: 0 }]
    });
    const clip = { x: 10, y: 29, width: 20, height: 1 };
    const projected = projectQuireSubLayoutQueryProductsToPage(source, clip, {
      dx: 100,
      dy: 200,
      page: {
        pageIndex: 1,
        range: { from: 3, to: 9 },
        pageRect: clip,
        bodyRect: clip,
        rect: clip,
        endInfo: { openMarks: [], openNodes: [] }
      }
    }, "page-occurrence");

    expect(projected.selectionRects[0]?.rect).toEqual({
      x: 120, y: 229, width: 0, height: 1
    });
    expect(projected.caretStops).toHaveLength(1);
  });

  it("retains an empty text line and its caret in a clipped snapshot", () => {
    const source = createTextProjection({
      text: "",
      range: { from: 4, to: 4 },
      rect: { x: 20, y: 29, width: 0, height: 16 },
      caretStops: [{ position: { pos: 4 }, localX: 0 }]
    });
    const products = adaptQuireSubLayoutQueryProductsForSnapshot({
      id: "root",
      range: { from: 3, to: 9 },
      rect: source.geometry.contentClip,
      subLayoutFragments: [{ subLayout: source }]
    }, [{ x: 10, y: 29, width: 20, height: 1 }], intersectsAnyClip);

    expect(products?.selectionRects).toHaveLength(1);
    expect(products?.caretStops).toHaveLength(1);
  });
});

/**
 * Creates a measured line whose caret ink occupies less height than its line box.
 * @param overrides - Optional text geometry for empty-line coverage.
 * @returns Canonical child-flow projection generated from accepted text geometry.
 */
function createTextProjection(
  overrides: Partial<QuireTextFragment> = {}
): QuireSubLayoutProjection {
  const rect = { x: 20, y: 29, width: 40, height: 16 };
  const text: QuireTextFragment = {
    id: "text-run",
    text: "line",
    range: { from: 4, to: 8 },
    rect,
    font: "12px test",
    lineHeight: 16,
    baseline: 41,
    runAscent: 10,
    runDescent: 3,
    caretStops: [4, 6, 8].map((pos, index) => ({
      position: { pos },
      localX: index * 20
    })),
    ...overrides
  };
  const child = {
    id: "child-flow-fragment",
    sourceId: "paragraph",
    range: { from: 3, to: 9 },
    rect,
    localRect: rect,
    textFragments: [text]
  };
  return createQuireSubLayoutProjection({
    geometry: {
      id: "flow-occurrence",
      trackId: "track",
      root: {
        id: "flow-root",
        kind: "extension-container",
        range: child.range,
        placement: { parentId: "container", rect, contentRect: rect },
        localRect: rect,
        writingMode: "horizontal-tb",
        dependencySignature: "text-query"
      },
      acceptedBand: { top: 29, bottom: 45 },
      fragments: [child],
      localToResult: { x: 0, y: 0 },
      coordinateSpace: "document",
      contentClip: rect,
      interactionClip: rect,
      continuation: null,
      dependencySignature: "text-query"
    },
    root: { ownership: { status: "unclaimed" } },
    queryProducts: createQuireSubLayoutQueryProducts([child])
  });
}

/**
 * Tests the snapshot's explicit visible clips without treating caret ink as a line.
 * @param rect - Candidate product rectangle in document coordinates.
 * @param clips - Explicit snapshot visibility clips.
 * @returns Whether the rectangle has visible area in an accepted clip.
 */
function intersectsAnyClip(rect: QuireRect, clips: readonly QuireRect[] | undefined): boolean {
  return clips === undefined || clips.some((clip) => intersectQuireRects(rect, clip) !== null);
}
