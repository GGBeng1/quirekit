import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../layout";
import { iterateQuireSubLayoutQueryProductSets } from "./product-sets";

describe("iterateQuireSubLayoutQueryProductSets", () => {
  const nodes = [
    createNode("first", [createNode("first-a"), createNode("first-b")]),
    createNode("second", [createNode("second-a")])
  ];

  it("visits parents before children while retaining sibling order by default", () => {
    const products = [...iterateQuireSubLayoutQueryProductSets(nodes)];

    expect(products.map(product => product.selectionRects[0]?.textFragmentId))
      .toEqual(["first", "first-a", "first-b", "second", "second-a"]);
  });

  it("visits children before parents without reversing siblings", () => {
    const products = [...iterateQuireSubLayoutQueryProductSets(nodes, true)];

    expect(products.map(product => product.selectionRects[0]?.textFragmentId))
      .toEqual(["first-a", "first-b", "first", "second-a", "second"]);
  });

  it("traverses through nodes without products in both orders", () => {
    const nested = [createNode("container", [
      createNode("child", [createNode("grandchild")]),
      createNode("sibling")
    ], false)];

    const parentFirst = [...iterateQuireSubLayoutQueryProductSets(nested)];
    const childrenFirst = [...iterateQuireSubLayoutQueryProductSets(nested, true)];

    expect(parentFirst.map(product => product.selectionRects[0]?.textFragmentId))
      .toEqual(["child", "grandchild", "sibling"]);
    expect(childrenFirst.map(product => product.selectionRects[0]?.textFragmentId))
      .toEqual(["grandchild", "child", "sibling"]);
  });
});

/**
 * Creates a layout node whose product identity exposes traversal order.
 * @param id - Node identity also carried by its text query product.
 * @param children - Ordered nested nodes visited through this node.
 * @param hasProducts - Whether the node itself contributes query products.
 * @returns Layout node with optional products and retained child order.
 */
function createNode(
  id: string,
  children: readonly QuireLayoutNode[] = [],
  hasProducts = true
): QuireLayoutNode {
  const range = { from: 1, to: 2 };
  const rect = { x: 0, y: 0, width: 20, height: 20 };
  return {
    id,
    kind: "block",
    range,
    rect,
    children,
    ...(hasProducts ? {
      subLayoutQueryProducts: {
        selectionRects: [{ textFragmentId: id, range, rect }],
        caretStops: [],
        hitTargets: [],
        inputAnchors: []
      }
    } : {})
  };
}
