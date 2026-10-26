import { expect, it } from "vitest";
import { findMindEditorTopics, mindEditorOutlineNodes } from "./outline";
const entries = [
  { id: "r", parentId: null, depth: 0, hidden: false, free: false, collapsed: true, text: "计划" },
  { id: "a", parentId: "r", depth: 1, hidden: true, free: false, collapsed: false, text: "中文 Goal [1]" },
  { id: "f", parentId: null, depth: 0, hidden: false, free: true, collapsed: false, text: "Goal" },
];
it("searches hidden and free topics with case-insensitive literal matching", () => {
  expect(findMindEditorTopics(entries, "goal").map(entry => entry.id)).toEqual(["a", "f"]);
  expect(findMindEditorTopics(entries, "[1]").map(entry => entry.id)).toEqual(["a"]);
  expect(findMindEditorTopics(entries, "中文").map(entry => entry.id)).toEqual(["a"]);
  expect(findMindEditorTopics(entries, "   ")).toEqual([]);
});
it("keeps complete canonical hierarchy separate from outline expansion state", () => {
  expect(mindEditorOutlineNodes(entries)).toEqual([
    { id: "r", label: "计划", children: [{ id: "a", label: "中文 Goal [1]" }] },
    { id: "f", label: "Goal · 自由主题" },
  ]);
});
