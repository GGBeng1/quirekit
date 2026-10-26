import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, parseFlowchart, readFlowchart, serializeFlowchart, updateFlowchartContent } from "../index";
it("preserves literal UML visibility, attributes and operations as independent compartments", () => {
  const node = createFlowchartNode("user", "uml-class", { x: 0, y: 0 }, "User");
  const doc = updateFlowchartContent({ ...createFlowchart(), nodes: [node] }, node.id, { text: "Account", uml: { attributes: ["- id: UUID", "# name: string"], operations: ["+ rename(value: string): void", "~ isActive(): boolean"] } });
  expect(parseFlowchart(serializeFlowchart(doc))).toEqual(doc);
  expect(doc.nodes[0]!.uml!.attributes).toHaveLength(2); expect(Object.isFrozen(doc.nodes[0]!.uml!.operations)).toBe(true);
  for (const uml of [{ attributes: ["bad\nrow"], operations: [] }, { attributes: [], operations: Array(101).fill("x") }, { attributes: [], operations: [], code: "ignored" }]) {
    expect(() => readFlowchart({ ...doc, nodes: [{ ...doc.nodes[0], uml }] })).toThrow();
  }
  expect(() => readFlowchart({ ...doc, nodes: [{ ...doc.nodes[0], shape: "er-entity" }] })).toThrow();
  expect(() => updateFlowchartContent(doc, node.id, { text: "Stale", uml: { attributes: [], operations: [] } }, node)).toThrow(/已更新/);
});
