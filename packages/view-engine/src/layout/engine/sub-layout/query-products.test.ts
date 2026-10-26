import type { QuireRect } from "@quirekit/renderer";
import type { QuireChildFlowFragment } from "@quirekit/layout/child-flow";
import { describe, expect, it } from "vitest";
import type { QuireLayoutBox } from "../types";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { createQuireSubLayoutQueryProducts } from "./query-products";

describe("createQuireSubLayoutQueryProducts", () => {
  it("adds a trailing blank hit target for the root interaction rectangle", () => {
    const fragment = childFragment("paragraph", { from: 3, to: 12 });
    const interactionRect = { x: 10, y: 20, width: 150, height: 96 };

    const products = createQuireSubLayoutQueryProducts(
      [fragment],
      interactionRect
    );

    expect(products.hitTargets).toEqual([
      {
        id: "paragraph:sub-layout-hit",
        range: { from: 3, to: 12 },
        rect: { x: 15, y: 25, width: 140, height: 24 }
      },
      {
        id: "paragraph:sub-layout-trailing-blank-hit",
        range: { from: 3, to: 12 },
        rect: { x: 10, y: 25, width: 150, height: 91 }
      }
    ]);
  });

  it("does not add a trailing blank hit target without child fragments", () => {
    const products = createQuireSubLayoutQueryProducts(
      [],
      { x: 10, y: 20, width: 150, height: 96 }
    );

    expect(products.hitTargets).toEqual([]);
  });

  it("derives query products from nested source-box text fragments", () => {
    const sourceBox: QuireLayoutBox & {
      readonly children: readonly QuireLayoutBox[];
    } = {
      id: "paragraph-wrapper",
      range: { from: 3, to: 12 },
      rect: { x: 15, y: 25, width: 140, height: 24 },
      children: [
        {
          id: "paragraph-text",
          range: { from: 4, to: 8 },
          rect: { x: 20, y: 29, width: 40, height: 16 },
          textFragments: [textFragment()]
        }
      ]
    };
    const fragment = childFragment("paragraph-wrapper", { from: 3, to: 12 });

    const products = createQuireSubLayoutQueryProducts(
      [fragment],
      undefined,
      [{ fragmentId: fragment.id, sourceBox }]
    );

    expect(products.selectionRects).toEqual([
      {
        textFragmentId: "paragraph-text:line",
        range: { from: 4, to: 8 },
        rect: { x: 20, y: 29, width: 40, height: 16 }
      }
    ]);
    expect(products.caretStops.map((stop) => stop.position)).toEqual([
      { pos: 4, bias: 1 },
      { pos: 6, bias: 0 },
      { pos: 8, bias: -1 }
    ]);
    expect(products.caretStops.map((stop) => stop.rect)).toEqual([
      { x: 20, y: 31, width: 1, height: 13 },
      { x: 40, y: 31, width: 1, height: 13 },
      { x: 60, y: 31, width: 1, height: 13 }
    ]);
    expect(products.caretStops.map((stop) => stop.lineBaseline)).toEqual([
      41,
      41,
      41
    ]);
    expect(products.inputAnchors.map((anchor) => anchor.position)).toEqual([
      { pos: 4, bias: 1 },
      { pos: 6, bias: 0 },
      { pos: 8, bias: -1 }
    ]);
  });
});

/**
 * Creates a child fragment fixture.
 *
 * @param id - Fragment id.
 * @param range - Fragment document range.
 * @returns Child fragment with a single text line.
 */
function childFragment(
  id: string,
  range: QuireChildFlowFragment["range"]
): QuireChildFlowFragment {
  const rect: QuireRect = { x: 15, y: 25, width: 140, height: 24 };

  return {
    id,
    sourceId: "source",
    range,
    rect,
    localRect: { x: 0, y: 0, width: 140, height: 24 }
  };
}

/**
 * Creates a text fragment with caret stops for query-product tests.
 *
 * @returns Text fragment fixture.
 */
function textFragment(): QuireTextFragment {
  return {
    id: "paragraph-text:line",
    text: "line",
    range: { from: 4, to: 8 },
    rect: { x: 20, y: 29, width: 40, height: 16 },
    font: "12px test",
    lineHeight: 16,
    baseline: 41,
    runAscent: 10,
    runDescent: 3,
    caretStops: [
      { position: { pos: 4, bias: 1 }, localX: 0 },
      { position: { pos: 6, bias: 0 }, localX: 20 },
      { position: { pos: 8, bias: -1 }, localX: 40 }
    ]
  };
}
