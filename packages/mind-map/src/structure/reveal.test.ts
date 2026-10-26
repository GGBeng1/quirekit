import { expect, it } from "vitest";
import { readMindMapDocument } from "../model/document";
import { revealMindMapTopic } from "./reveal";
const leaf = { id: "leaf", text: "隐藏主题", collapsed: false, children: [] };
const branch = { id: "branch", text: "折叠", collapsed: true, children: [leaf] };
const document = readMindMapDocument({ version: 2, revision: 4, layout: "mind-map",
  root: { id: "root", text: "root", collapsed: false, children: [branch] },
  floatingTopics: [{ root: { ...branch, id: "free", children: [{ ...leaf, id: "free-leaf" }] }, position: { x: -20, y: 30 }, side: "left" }] });
it("reveals only a hidden target's ancestors without touching its own folding or unrelated trees", () => {
  const result = revealMindMapTopic(document, "leaf");
  expect(result.selectedIds).toEqual(["leaf"]);
  expect(result.document.root.children[0]?.collapsed).toBe(false);
  expect(result.document.floatingTopics).toEqual(document.floatingTopics);
  expect(result.document.revision).toBe(4);
  expect(document.root.children[0]?.collapsed).toBe(true);
});
it("reveals free descendants with their direction and position intact", () => {
  const result = revealMindMapTopic(document, "free-leaf");
  expect(result.document.root).toEqual(document.root);
  expect(result.document.floatingTopics?.[0]).toMatchObject({ position: { x: -20, y: 30 }, side: "left", root: { collapsed: false } });
});
it("does no work for visible or missing targets", () => {
  expect(revealMindMapTopic(document, "branch").document).toBe(document);
  expect(revealMindMapTopic(document, "missing")).toEqual({ document, selectedIds: [] });
});
