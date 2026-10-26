import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, readFlowchart, serializeFlowchart, parseFlowchart } from "../index";

it("preserves entity fields as bounded, immutable data rather than a caption convention", () => {
  const node = { ...createFlowchartNode("users", "er-entity", { x: 0, y: 0 }, "用户"), entity: { fields: [{ name: "id", type: "uuid", key: "primary" }, { name: "team_id", type: "uuid", key: "foreign" }] } };
  const doc = readFlowchart({ ...createFlowchart(), nodes: [node] });
  expect(parseFlowchart(serializeFlowchart(doc))).toEqual(doc);
  expect(Object.isFrozen(doc.nodes[0]!.entity!.fields[0])).toBe(true);
  for (const entity of [{ fields: [{ name: "bad\nname", type: "", key: "none" }] }, { fields: Array(101).fill(node.entity.fields[0]) }, { fields: [{ name: "x", type: "int", key: "index" }] }]) {
    expect(() => readFlowchart({ ...doc, nodes: [{ ...node, entity }] })).toThrow();
  }
  expect(() => readFlowchart({ ...doc, nodes: [{ ...node, shape: "rectangle" }] })).toThrow();
  expect(() => readFlowchart({ ...doc, nodes: [{ ...node, entity: undefined }] })).toThrow();
});

it("rejects hidden extra fields and accounts entity rows in the whole-document text budget", () => {
  const node = createFlowchartNode("x", "er-entity", { x: 0, y: 0 }, "Entity");
  expect(() => readFlowchart({ ...createFlowchart(), nodes: [{ ...node, entity: { fields: [{ name: "x", type: "int", key: "none", hidden: true }] } }] })).toThrow();
  const fields = Array.from({ length: 100 }, () => ({ name: "a".repeat(300), type: "b".repeat(300), key: "none" }));
  expect(() => readFlowchart({ ...createFlowchart(), nodes: Array.from({ length: 20 }, (_, i) => ({ ...node, id: `n${i}`, entity: { fields } })) })).toThrow(/budget/);
});
