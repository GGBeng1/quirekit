import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, instantiateFlowchart } from "../model/create";
import { parseFlowchart, readFlowchart, serializeFlowchart } from "../model/document";

it("preserves parent identities and relative attachments through clone and JSON", () => {
  const child = { ...createFlowchartNode("child", "process", { x: 140, y: 90 }, "服务"), parent: "layer" };
  const layer = { ...createFlowchartNode("layer", "process", { x: 0, y: 0 }, "应用层"), shape: "container", width: 500, height: 250 };
  const source = readFlowchart({ ...createFlowchart(), nodes: [layer, child], edges: [{ id: "message", source: { node: "child", anchor: { x: 1, y: 0.25 } }, target: { x: 400, y: 90 }, vertices: [], routing: "straight", label: "请求", labelPosition: 0.5, style: {} }] });
  expect(parseFlowchart(serializeFlowchart(source))).toEqual(source);
  const copy = instantiateFlowchart(source, "copy");
  expect(copy.nodes[1]).toMatchObject({ parent: copy.nodes[0]!.id });
  expect(copy.edges[0]!.source).toEqual({ node: copy.nodes[1]!.id, anchor: { x: 1, y: 0.25 } });
});

it("rejects invalid hierarchy and ambiguous or out-of-bounds anchors", () => {
  const node = createFlowchartNode("a", "process", { x: 0, y: 0 }, "A"), container = { ...node, shape: "container" };
  for (const nodes of [[{ ...container, parent: "a" }], [{ ...container, parent: "missing" }],
    [{ ...container, parent: "b" }, { ...container, id: "b", parent: "a" }], [node, { ...node, id: "b", parent: "a" }]]) {
    expect(() => readFlowchart({ ...createFlowchart(), nodes })).toThrow();
  }
  const chain = Array.from({ length: 32 }, (_, i) => ({ ...container, id: `node-${i}`, ...(i ? { parent: `node-${i - 1}` } : {}) }));
  expect(readFlowchart({ ...createFlowchart(), nodes: chain }).nodes).toHaveLength(32);
  expect(() => readFlowchart({ ...createFlowchart(), nodes: [...chain, { ...node, parent: "node-31" }] })).toThrow(/depth/);
  for (const source of [{ node: "a", port: "top", anchor: { x: 0, y: 0 } }, { node: "a", anchor: { x: -0.1, y: 0 } }, { node: "a", anchor: { x: 0.5, y: Infinity } }]) {
    expect(() => readFlowchart({ ...createFlowchart(), nodes: [node], edges: [{ id: "e", source, target: { x: 1, y: 1 }, vertices: [], routing: "straight", label: "", labelPosition: 0.5, style: {} }] })).toThrow();
  }
});
