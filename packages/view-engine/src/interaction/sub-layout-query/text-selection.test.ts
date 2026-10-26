import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDocumentRange } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireLayoutNode, QuireSubLayoutQueryProducts } from "../../layout";
import { createQuireSubLayoutQueryProducts } from "../../layout/engine/sub-layout/query-products";
import { hitTestQuireSubLayoutQueryProducts } from "./hit";
import { hitTestNearestQuireSubLayoutCaret } from "./hit";
import { buildQuireSubLayoutRangeGeometriesForNode } from "./range";

describe("retained text fragment selection", () => {
  it("trims a partial range when caret run metrics differ from the line box", () => {
    const node = createTextNode([createTextFragment("text", 1, 0, 0)]);

    expect(readRangeRects(node, { from: 2, to: 4 })).toEqual([
      { x: 10, y: 0, width: 20, height: 24 }
    ]);
  });

  it.each([1, 12, 23])("uses the same source caret throughout line-box y=%s", (y) => {
    const node = createTextNode([createTextFragment("text", 1, 0, 0)]);

    expect(hitTestQuireSubLayoutQueryProducts([node], { x: 21, y }))
      .toMatchObject({ position: { pos: 3 }, rect: { y: 0, height: 24 } });
  });

  it("keeps partial geometry and hit positions continuous across mixed run metrics", () => {
    const regular = createTextFragment("regular", 1, 0, 0);
    const small = {
      ...createTextFragment("small", 5, 40, 0),
      baseline: 16,
      runAscent: 8,
      runDescent: 2
    };
    const node = createTextNode([regular, small]);

    expect(readRangeRects(node, { from: 3, to: 7 })).toEqual([
      { x: 20, y: 0, width: 20, height: 24 },
      { x: 40, y: 0, width: 20, height: 24 }
    ]);
    for (const y of [1, 12, 23]) {
      expect(hitTestQuireSubLayoutQueryProducts([node], { x: 61, y }))
        .toMatchObject({ position: { pos: 7 } });
    }
  });

  it("uses the selected visual run's own RTL endpoints at shared source positions", () => {
    const node = createTextNode([
      createTextFragment("ltr", 1, 0, 0),
      createTextFragment("rtl", 5, 40, 0, true)
    ]);

    expect(readRangeRects(node, { from: 3, to: 7 })).toEqual([
      { x: 20, y: 0, width: 20, height: 24 },
      { x: 60, y: 0, width: 20, height: 24 }
    ]);
    expect(hitTestQuireSubLayoutQueryProducts([node], { x: 51, y: 12 }))
      .toMatchObject({ position: { pos: 8 } });
  });

  it("keeps identical source text ids separate in repeated visual owners", () => {
    const first = createTextNode([createTextFragment("repeated-text", 1, 0, 0)]);
    const second = createTextNode([createTextFragment("repeated-text", 1, 100, 0)]);
    const firstProducts = withOwner(first.subLayoutQueryProducts!, "page-1");
    const secondProducts = withOwner(second.subLayoutQueryProducts!, "page-2");
    const node: QuireLayoutNode = {
      ...first,
      rect: { x: 0, y: 0, width: 140, height: 24 },
      subLayoutQueryProducts: {
        selectionRects: [...firstProducts.selectionRects, ...secondProducts.selectionRects],
        caretStops: [...firstProducts.caretStops, ...secondProducts.caretStops],
        hitTargets: [...firstProducts.hitTargets, ...secondProducts.hitTargets],
        inputAnchors: [...firstProducts.inputAnchors, ...secondProducts.inputAnchors]
      }
    };

    expect(readRangeRects(node, { from: 2, to: 4 })).toEqual([
      { x: 10, y: 0, width: 20, height: 24 },
      { x: 110, y: 0, width: 20, height: 24 }
    ]);
    expect(hitTestQuireSubLayoutQueryProducts([node], { x: 121, y: 12 }))
      .toMatchObject({ position: { pos: 3 }, queryOwner: { sourceFragmentId: "page-2" } });
  });

  it("does not expand partial selection when its fragment lacks an endpoint", () => {
    const source = createTextNode([createTextFragment("text", 1, 0, 0)]);
    const products = source.subLayoutQueryProducts!;
    const node: QuireLayoutNode = {
      ...source,
      subLayoutQueryProducts: {
        ...products,
        caretStops: products.caretStops.filter((stop) => stop.position.pos !== 2)
      }
    };

    expect(readRangeRects(node, { from: 2, to: 4 })).toEqual([]);
  });

  it("clips complete caret endpoints to the accepted fragment's narrower line band", () => {
    const source = createTextNode([createTextFragment("text", 1, 0, 0)]);
    const products = source.subLayoutQueryProducts!;
    const node: QuireLayoutNode = {
      ...source,
      subLayoutQueryProducts: {
        ...products,
        // Page projection retains complete source endpoints even when the visible
        // accepted text band is narrower than the containing node's own clip.
        selectionRects: products.selectionRects.map((entry) => ({
          ...entry,
          rect: { x: 10, y: 0, width: 20, height: 24 }
        }))
      }
    };

    expect(readRangeRects(node, { from: 2, to: 5 })).toEqual([
      { x: 10, y: 0, width: 20, height: 24 }
    ]);
  });

  it("keeps distinct owner endpoints when text ids and line rectangles coincide", () => {
    const source = createTextNode([createTextFragment("same-text", 1, 0, 0)]);
    const first = withOwner(source.subLayoutQueryProducts!, "first-instance");
    const second = withOwner({
      ...source.subLayoutQueryProducts!,
      caretStops: source.subLayoutQueryProducts!.caretStops.map((entry) => ({
        ...entry,
        rect: { ...entry.rect, x: 4 + entry.rect.x * 0.8 }
      }))
    }, "second-instance");
    const node: QuireLayoutNode = {
      ...source,
      subLayoutQueryProducts: {
        selectionRects: [...first.selectionRects, ...second.selectionRects],
        caretStops: [...first.caretStops, ...second.caretStops],
        hitTargets: [...first.hitTargets, ...second.hitTargets],
        inputAnchors: [...first.inputAnchors, ...second.inputAnchors]
      }
    };

    expect(readRangeRects(node, { from: 2, to: 4 })).toEqual([
      { x: 10, y: 0, width: 20, height: 24 },
      { x: 12, y: 0, width: 16, height: 24 }
    ]);
  });

  it("keeps nearest-caret target metadata in the selected visual occurrence", () => {
    const source = createTextNode([createTextFragment("same-text", 1, 0, 0)]);
    const first = withOwner(source.subLayoutQueryProducts!, "first-instance");
    const second = withOwner({
      ...source.subLayoutQueryProducts!,
      caretStops: source.subLayoutQueryProducts!.caretStops.map((entry) => ({
        ...entry,
        rect: entry.position.pos === 3
          ? { ...entry.rect, x: entry.rect.x + 2 }
          : entry.rect
      }))
    }, "second-instance");
    const node: QuireLayoutNode = {
      ...source,
      subLayoutQueryProducts: {
        selectionRects: [...first.selectionRects, ...second.selectionRects],
        caretStops: [...first.caretStops, ...second.caretStops],
        hitTargets: [...first.hitTargets, ...second.hitTargets],
        inputAnchors: [...first.inputAnchors, ...second.inputAnchors]
      }
    };

    // Both occurrences cover the same pixels. The blank point is closest to the
    // second occurrence's interior caret, so target rebinding must retain it.
    expect(hitTestNearestQuireSubLayoutCaret([node], { x: 22, y: 30 }))
      .toMatchObject({
        position: { pos: 3 },
        queryOwner: { sourceFragmentId: "second-instance" },
        viewRegion: { visualInstanceId: "second-instance" },
        ownerSource: { sourceId: "second-instance" }
      });
  });

  it("keeps wrapped source boundaries local and resolves interline gaps by line then x", () => {
    const node = createTextNode([
      createTextFragment("line-1", 1, 0, 0),
      createTextFragment("line-2", 5, 0, 32)
    ]);

    expect(readRangeRects(node, { from: 3, to: 7 })).toEqual([
      { x: 20, y: 0, width: 20, height: 24 },
      { x: 0, y: 32, width: 20, height: 24 }
    ]);
    expect(hitTestQuireSubLayoutQueryProducts([node], { x: 21, y: 27 }))
      .toMatchObject({ position: { pos: 3 } });
    expect(hitTestQuireSubLayoutQueryProducts([node], { x: 21, y: 29 }))
      .toMatchObject({ position: { pos: 7 } });
  });

  it("keeps trailing blanks at the last line end with exact target ownership", () => {
    const source = createTextNode([
      createTextFragment("line-1", 1, 0, 0),
      createTextFragment("line-2", 5, 0, 32)
    ]);
    const products = withOwner(source.subLayoutQueryProducts!, "trailing-instance");
    const node: QuireLayoutNode = {
      ...source,
      subLayoutQueryProducts: {
        ...products,
        caretStops: [...products.caretStops].reverse(),
        hitTargets: products.hitTargets.map((target) => ({
          ...target,
          rect: { ...target.rect, height: 80 }
        }))
      }
    };

    // A blank near the left edge still chooses the last line's physical end;
    // candidate enumeration order must not replace this established policy.
    expect(hitTestQuireSubLayoutQueryProducts([node], { x: 1, y: 70 }))
      .toMatchObject({
        position: { pos: 9 },
        rect: { y: 32, height: 24 },
        queryOwner: { sourceFragmentId: "trailing-instance" },
        ownerSource: { sourceId: "trailing-instance" }
      });
  });
});

/**
 * Creates a measured visual run with distinct run and line rectangles.
 *
 * @param id - Exact text fragment identity.
 * @param from - Leading logical source position.
 * @param x - Physical left edge of this visual run.
 * @param y - Shared visual line top.
 * @param rtl - Whether source positions decrease with physical x.
 * @returns Four-character visual run with five measured caret stops.
 */
function createTextFragment(
  id: string,
  from: number,
  x: number,
  y: number,
  rtl = false
): QuireTextFragment {
  return {
    id,
    text: rtl ? "אבגד" : "abcd",
    range: { from, to: from + 4 },
    rect: { x, y, width: 40, height: 24 },
    font: "16px test",
    lineHeight: 24,
    baseline: y + 18,
    runAscent: 12,
    runDescent: 3,
    ...(rtl ? { direction: "rtl" as const } : {}),
    caretStops: Array.from({ length: 5 }, (_, index) => {
      const pos = from + (rtl ? 4 - index : index);
      return {
        position: { pos, bias: pos === from ? 1 : pos === from + 4 ? -1 : 0 },
        localX: index * 10
      };
    })
  };
}

/**
 * Runs the production query producer for an editable child-flow fragment.
 *
 * @param textFragments - Measured visual runs in source/visual flow order.
 * @returns Layout node carrying canonical query products.
 */
function createTextNode(textFragments: readonly QuireTextFragment[]): QuireLayoutNode {
  const x = Math.min(...textFragments.map((fragment) => fragment.rect.x));
  const y = Math.min(...textFragments.map((fragment) => fragment.rect.y));
  const right = Math.max(...textFragments.map((fragment) => fragment.rect.x + fragment.rect.width));
  const bottom = Math.max(...textFragments.map((fragment) => fragment.rect.y + fragment.rect.height));
  const rect = { x, y, width: right - x, height: bottom - y };
  const range = {
    from: Math.min(...textFragments.map((fragment) => fragment.range.from)) - 1,
    to: Math.max(...textFragments.map((fragment) => fragment.range.to)) + 1
  };
  const fragment = {
    id: "child-flow",
    sourceId: "source",
    range,
    rect,
    localRect: { ...rect, x: 0, y: 0 },
    textFragments
  };
  return {
    id: "text-owner",
    kind: "block",
    range,
    rect,
    children: [],
    subLayoutQueryProducts: createQuireSubLayoutQueryProducts([fragment])
  };
}

/**
 * Reads visible range rectangles from the production sub-layout consumer.
 *
 * @param node - Query products and their visibility clip.
 * @param range - Exact selected source interval.
 * @returns Highlight rectangles without unrelated ownership metadata.
 */
function readRangeRects(node: QuireLayoutNode, range: QuireDocumentRange) {
  return buildQuireSubLayoutRangeGeometriesForNode(node, range, node.rect)
    .map((geometry) => geometry.rect);
}

/**
 * Supplies equal-by-value, distinct owner objects to each retained record.
 *
 * @param products - Canonical text products to qualify.
 * @param instance - Repeated visual occurrence identity.
 * @returns Products whose per-record owner values identify the same occurrence.
 */
function withOwner(
  products: QuireSubLayoutQueryProducts,
  instance: string
): QuireSubLayoutQueryProducts {
  /**
   * Allocates owner identity independently for each product record.
   *
   * @returns Fresh ownership object with the same occurrence identity.
   */
  const owner = (): QuireLayoutQueryProductOwner => ({
    sourceRootId: "repeated-root",
    sourceFragmentId: instance,
    coordinateSpace: "document",
    region: {
      kind: "block-container",
      rootId: { value: "root" },
      regionId: { value: "region" },
      visualInstanceId: instance
    }
  });
  return {
    selectionRects: products.selectionRects.map((entry) => ({ ...entry, queryOwner: owner() })),
    caretStops: products.caretStops.map((entry) => ({ ...entry, queryOwner: owner() })),
    hitTargets: products.hitTargets.map((entry) => ({
      ...entry,
      queryOwner: owner(),
      viewRegion: owner().region!,
      source: { sourceId: instance, range: entry.range }
    })),
    inputAnchors: products.inputAnchors.map((entry) => ({ ...entry, queryOwner: owner() }))
  };
}
