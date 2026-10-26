import { expect, it } from "vitest";
import { createMindMapDocument } from "../outline/create";
import { moveMindMapTopic } from "../model/forest";
import { focusMindMapBranch } from "./focus";

it("focuses one branch by folding peers while preserving complete trees and free positions", () => {
  const initial = createMindMapDocument({ text: "root", children: [0, 1, 2].map(i => ({ text: `branch${i}`, children: [{ text: "child", children: [] }] })) });
  const source = moveMindMapTopic(initial, initial.root.children[2]!.id, { x: 300, y: 200 });
  const id = source.root.children[1]!.id, next = focusMindMapBranch(source, id);
  expect(next.root.children.map(node => node.collapsed)).toEqual([true, false]);
  expect(next.root.children[0]!.children).toEqual(source.root.children[0]!.children);
  expect(next.floatingTopics![0]!.position).toEqual({ x: 300, y: 200 });
  expect(next.floatingTopics![0]!.root.collapsed).toBe(true);
  expect(next.revision).toBe(source.revision);
  expect(focusMindMapBranch(next, id)).toBe(next);
  expect(() => focusMindMapBranch(source, "missing")).toThrow(/no longer exists/u);
});
