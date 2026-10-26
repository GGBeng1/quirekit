import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, updateFlowchartContent } from "../index";
it("expands edited compartments without shrinking existing sizes and respects inherited locks", () => {
  const node = createFlowchartNode("entity", "er-entity", { x: 0, y: 0 }, "E");
  const fields = Array.from({ length: 20 }, (_, i) => ({ name: `field${i}`, type: "int", key: "none" as const }));
  const doc = { ...createFlowchart(), nodes: [node] };
  const after = updateFlowchartContent(doc, node.id, { text: "Changed", entity: { fields } });
  expect(after.nodes[0]!.height).toBeGreaterThan(node.height);
  expect(updateFlowchartContent(after, node.id, { text: "Empty", entity: { fields: [] } }).nodes[0]!.height).toBe(after.nodes[0]!.height);
  expect(() => updateFlowchartContent(doc, "missing", { text: "x" })).toThrow();
  expect(() => updateFlowchartContent(doc, node.id, { text: "x", shape: "rectangle" } as never)).toThrow();
  const group = { ...createFlowchartNode("group", "group", { x: 0, y: 0 }, ""), locked: true };
  expect(() => updateFlowchartContent({ ...doc, nodes: [group, { ...node, parent: group.id }] }, node.id, { text: "x", entity: { fields } })).toThrow(/锁定/);
  expect(doc.nodes[0]).toEqual(node);
});
