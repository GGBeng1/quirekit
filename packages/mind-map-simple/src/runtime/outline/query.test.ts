import { expect, it } from "vitest";
import { readSimpleOutline } from "./query";
import { toSimpleTree } from "../../codec/mapping";
import { readMindMapDocument } from "@quirekit/mind-map";
it("indexes hidden text and independent roots without exposing the private carrier", () => {
  const tree = toSimpleTree(readMindMapDocument({ version: 2, revision: 0, layout: "mind-map",
    root: { id: "r", text: "root", collapsed: false, children: [{ id: "a", text: "branch", collapsed: true,
      children: [{ id: "b", text: "隐藏", collapsed: false, children: [] }] }] },
    floatingTopics: [{ root: { id: "f", text: "独立", collapsed: false, children: [] }, position: { x: 10, y: 20 }, side: "left" }] }));
  const outline = readSimpleOutline(tree);
  expect(outline.map(node => [node.id, node.parentId, node.depth, node.hidden, node.free])).toEqual([
    ["r", null, 0, false, false], ["a", "r", 1, false, false], ["b", "a", 2, true, false], ["f", null, 0, false, true],
  ]);
  tree.children[0]!.children[0]!.data.text = "changed";
  expect(outline[2]?.text).toBe("隐藏");
  expect(Object.isFrozen(outline[2])).toBe(true);
});
