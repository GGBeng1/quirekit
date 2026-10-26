import { describe, expect, it } from "vitest";
import { readMindMapDocument, serializeMindMap, parseMindMap } from "../model/document";
import type { MindMapNode } from "../model/types";
import { editMindMapStructure } from "./operations";

/** @param id - Stable test identity. @param children - Ordered descendants. @returns A literal topic. */
function node(id: string, children: MindMapNode[] = []): MindMapNode { return { id, text: id, collapsed: false, children }; }
const source = readMindMapDocument({ version: 2, revision: 7, layout: "mind-map",
  root: node("root", [node("a", [node("a1"), node("a2", [node("deep")])]), node("b"), node("c"), node("d")]),
  floatingTopics: [{ root: node("free", [node("f1"), node("f2")]), position: { x: -200, y: 30 }, side: "left" }] });

describe("portable mind-map structure editing", () => {
  it("wraps a complete branch, keeps siblings on their sides, and never mutates its source", () => {
    const result = editMindMapStructure(source, ["a"], "add-parent", () => "parent");
    expect(result.selectedIds).toEqual(["parent"]);
    expect(result.document.root.children[0]).toMatchObject({ id: "parent", side: "right", children: [source.root.children[0]] });
    expect(result.document.root.children.map(child => child.side)).toEqual(["right", "left", "right", "left"]);
    expect(source.root.children.map(child => child.id)).toEqual(["a", "b", "c", "d"]);
    expect(result.document.revision).toBe(7);
    expect(parseMindMap(serializeMindMap(result.document))).toEqual(result.document);
  });
  it("wraps a free root at the same position without a main-root connector", () => {
    const result = editMindMapStructure(source, ["free"], "add-parent", () => "parent");
    expect(result.document.floatingTopics?.[0]).toMatchObject({ position: { x: -200, y: 30 }, side: "left",
      root: { id: "parent", children: [source.floatingTopics![0]!.root] } });
  });
  it("indents into the previous same-side sibling and outdents immediately after its parent", () => {
    const indented = editMindMapStructure(source, ["c"], "indent").document;
    expect(indented.root.children.map(child => child.id)).toEqual(["a", "b", "d"]);
    expect(indented.root.children[0]?.children.map(child => child.id)).toEqual(["a1", "a2", "c"]);
    const restored = editMindMapStructure(indented, ["c"], "outdent").document;
    expect(restored.root.children.map(child => child.id)).toEqual(["a", "c", "b", "d"]);
    expect(restored.root.children.map(child => child.side)).toEqual(["right", "right", "left", "left"]);
    expect(restored.root.children[0]?.children.map(child => child.id)).toEqual(["a1", "a2"]);
  });
  it("reorders only same-side siblings and keeps nested/free-tree descendants", () => {
    const moved = editMindMapStructure(source, ["d"], "move-up").document;
    expect(moved.root.children.map(child => child.id)).toEqual(["a", "d", "c", "b"]);
    expect(moved.root.children.map(child => child.side)).toEqual(["right", "left", "right", "left"]);
    expect(editMindMapStructure(source, ["f2"], "move-up").document.floatingTopics?.[0]?.root.children.map(child => child.id)).toEqual(["f2", "f1"]);
    expect(editMindMapStructure(source, ["a1"], "move-down").document.root.children[0]?.children[0]?.children[0]?.id).toBe("deep");
  });
  it.each(["add-parent", "indent", "outdent", "move-up", "move-down"] as const)("keeps main-root %s a no-op", command => {
    expect(editMindMapStructure(source, ["root"], command).document).toBe(source);
  });
  it("does not record boundary, missing-target or ambiguous multi-selection changes", () => {
    for (const [ids, command] of [[[], "indent"], [["b"], "indent"], [["a"], "outdent"], [["free"], "outdent"],
      [["a"], "move-up"], [["c"], "move-down"], [["a", "b"], "add-parent"], [["missing"], "move-up"]] as const) {
      expect(editMindMapStructure(source, ids, command).document).toBe(source);
    }
  });
  it("collapses overlapping selections recursively, preserves hidden content and expands all trees", () => {
    const collapsed = editMindMapStructure(source, ["root", "a", "free"], "collapse-selected").document;
    expect(collapsed.root.collapsed).toBe(false);
    expect(collapsed.root.children[0]).toMatchObject({ collapsed: true, children: [{ id: "a1" }, { id: "a2", collapsed: true, children: [{ id: "deep" }] }] });
    expect(collapsed.floatingTopics?.[0]?.root.collapsed).toBe(true);
    expect(editMindMapStructure(collapsed, [], "expand-all").document).toEqual(source);
    expect(editMindMapStructure(source, [], "expand-all").document).toBe(source);
  });
  it("rejects duplicate new identities atomically", () => {
    expect(() => editMindMapStructure(source, ["a"], "add-parent", () => "deep")).toThrow();
    expect(source.root.children[0]?.id).toBe("a");
  });
});
