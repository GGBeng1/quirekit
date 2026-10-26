import { expect, it } from "vitest";
import { serializeFlowchart, parseFlowchart } from "@quirekit/flowchart";
import { createFlowchartTemplate, flowchartTemplates } from "./catalog";
it("templates are independently editable graphs with coherent fresh references", () => {
  expect(flowchartTemplates).toHaveLength(31);
  for (const { id } of flowchartTemplates) {
    const a = createFlowchartTemplate(id, "first"), b = createFlowchartTemplate(id, "second");
    expect(a.nodes.length === 0).toBe(id === "blank");
    expect(parseFlowchart(serializeFlowchart(a))).toEqual(a);
    expect(a.nodes.every(n => !b.nodes.some(m => n.id === m.id))).toBe(true);
  }
  expect(createFlowchartTemplate("approval", "loop").edges).toHaveLength(6);
});

it("rejects unknown template identities rather than silently replacing content", () => {
  expect(() => createFlowchartTemplate("invalid" as never, "x")).toThrow();
});

it("keeps frameless template captions theme-driven for dark canvases", () => {
  for (const { id } of flowchartTemplates) {
    for (const node of createFlowchartTemplate(id, "caption").nodes.filter(node => node.shape === "text")) {
      expect(node.style.color).toBeUndefined(); expect(node.style.fill).toBeUndefined();
    }
  }
});
