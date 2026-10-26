import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "@quirekit/view-engine";
import { createHtmlBlockHitTree, queryHtmlBlockHitTree } from "./regions";

/** @param blocks - Leaf blocks for a measured fixture. @returns A continuous root. */
function root(blocks: readonly QuireLayoutNode[]): QuireLayoutNode {
  return { id: "root", kind: "block", range: { from: 0, to: 100_000 }, rect: { x: 0, y: 0, width: 800, height: 100_000 }, children: blocks };
}
/** @param id - Source order. @param x - Horizontal position. @param y - Vertical position. @returns Measured leaf. */
function block(id: number, x: number, y: number): QuireLayoutNode {
  return { id: String(id), kind: "block", range: { from: id * 10, to: id * 10 + 10 }, rect: { x, y, width: 100, height: 20 } };
}

describe("HTML gap spatial ownership", () => {
  it("chooses by vertical distance before horizontal distance and breaks ties by source order", () => {
    const tree = createHtmlBlockHitTree(root([block(1, 0, 0), block(2, 200, 40)]));
    expect(queryHtmlBlockHitTree(tree, { x: 250, y: 25 }).block?.id).toBe("1");
    expect(queryHtmlBlockHitTree(tree, { x: 250, y: 35 }).block?.id).toBe("2");
    expect(queryHtmlBlockHitTree(tree, { x: 150, y: 30 }).block?.id).toBe("1");
  });
  it("resolves side-by-side cells and confines container padding to its own content", () => {
    const tree = createHtmlBlockHitTree(root([block(1, 0, 0), block(2, 200, 0), block(3, 0, 40)]));
    expect(queryHtmlBlockHitTree(tree, { x: 190, y: 10 }).block?.id).toBe("2");
    expect(queryHtmlBlockHitTree(tree, { x: 0, y: 10 }, { from: 20, to: 40 }).block?.id).toBe("2");
  });
  it("uses visible leaves, including an empty container but excluding hidden blocks", () => {
    const hidden = { ...block(2, 0, 40), rect: { x: 0, y: 0, width: 0, height: 0 } };
    const container = { ...block(1, 0, 40), children: [hidden] };
    const tree = createHtmlBlockHitTree(root([container, hidden]));
    expect(queryHtmlBlockHitTree(tree, { x: 10, y: 50 }).block?.id).toBe("1");
  });
  it("bounds a long continuous document query instead of scanning every block", () => {
    const tree = createHtmlBlockHitTree(root(Array.from({ length: 10_000 }, (_, i) => block(i, 0, i * 40))));
    for (const i of [0, 340, 5000, 9999]) {
      const result = queryHtmlBlockHitTree(tree, { x: 50, y: i * 40 + 25 });
      expect(result.block?.id).toBe(String(i));
      expect(result.visited).toBeLessThan(50);
    }
  });
});
