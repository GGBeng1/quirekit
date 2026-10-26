import { describe, expect, it } from "vitest";
import { createMindMapDocument } from "../outline/create";
import { editMindMapDiagram } from "./edit";

describe("Agent mind map edits", () => {
  it("creates nested topics, changes details, moves, reorders and removes by id", () => {
    const base = createMindMapDocument({ text: "项目", children: [{ text: "目标", children: [] }] });
    const goal = base.root.children[0]!.id;
    const grown = editMindMapDiagram(base, { topics: [
      { id: "plan", text: "计划", parent: base.root.id },
      { id: "risk", text: "风险", parent: "plan", note: "排期紧张", marker: "priority-1" },
      { id: "first", text: "首要", parent: base.root.id, index: 0 }
    ] });
    expect(grown.root.children.map(child => child.text)).toEqual(["首要", "目标", "计划"]);
    expect(grown.root.children[2]!.children[0]).toMatchObject({ id: "risk", details: { note: "排期紧张", marker: "priority-1" } });
    expect(grown.revision).toBe(base.revision);

    const changed = editMindMapDiagram(grown, { topics: [{ id: "risk", parent: goal, text: "延期风险", marker: null }, { id: "plan", index: 0 }], remove: ["first"], layout: "organization" });
    expect(changed.root.children.map(child => child.id)).toEqual(["plan", goal]);
    expect(changed.root.children[1]!.children[0]).toMatchObject({ id: "risk", text: "延期风险" });
    expect(changed.root.children[1]!.children[0]!.details?.marker).toBeUndefined();
    expect(changed.layout).toBe("organization");
  });

  it("refuses missing parents and the main topic's removal", () => {
    const base = createMindMapDocument({ text: "项目", children: [] });
    expect(() => editMindMapDiagram(base, { topics: [{ id: "x", text: "孤立" }] })).toThrow("parent");
    expect(() => editMindMapDiagram(base, { topics: [{ id: "x", parent: "nowhere" }] })).toThrow("nowhere");
    expect(() => editMindMapDiagram(base, { remove: [base.root.id] })).toThrow("中心主题");
  });
});
