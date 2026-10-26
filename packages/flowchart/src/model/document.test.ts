import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, instantiateFlowchart, parseFlowchart, readFlowchart, serializeFlowchart } from "../index";

describe("portable flowchart source", () => {
  const node = createFlowchartNode("a", "decision", { x: -10, y: 25 }, "通过？\n中文 🐈");
  const edge = { id: "e", source: { node: "a", port: "bottom" }, target: { node: "a", port: "left" },
    vertices: [{ x: -80, y: 150 }], routing: "orthogonal", label: "否", labelPosition: 0.4,
    style: { stroke: "#123456", width: 2, dashed: true, sourceArrow: "none", targetArrow: "block" } };
  const source = { ...createFlowchart(), nodes: [node], edges: [edge] };
  it("roundtrips Chinese, loops, vertices, styles and detached immutable data", () => {
    const doc = readFlowchart(source);
    expect(parseFlowchart(serializeFlowchart(doc))).toEqual(source);
    expect(Object.isFrozen(doc.edges[0]?.vertices[0])).toBe(true);
    expect(doc.nodes[0]).not.toBe(node);
  });
  it("keeps free terminals and empty documents", () => {
    expect(readFlowchart({ ...source, edges: [{ ...edge, target: { x: 11, y: 22 } }] }).edges[0]?.target).toEqual({ x: 11, y: 22 });
    expect(parseFlowchart(serializeFlowchart(createFlowchart())).nodes).toEqual([]);
  });
  it.each([
    { ...source, future: {} }, { ...source, version: 2 }, { ...source, revision: Number.MAX_SAFE_INTEGER },
    { ...source, nodes: [node, node] }, { ...source, edges: [{ ...edge, target: { node: "missing" } }] },
    { ...source, nodes: [{ ...node, style: { fill: "url(https://example.com)" } }] },
    { ...source, nodes: [{ ...node, x: Infinity }] }, { ...source, nodes: [{ ...node, text: "\u0000" }] },
    { ...source, edges: [{ ...edge, source: { node: "a", port: "future" } }] },
    { ...source, edges: [{ ...edge, vertices: Array(257).fill({ x: 0, y: 0 }) }] },
  ])("rejects unsafe or unsupported semantics without silent dropping", value => {
    expect(() => readFlowchart(value)).toThrow();
  });
  it("does not invoke getters", () => {
    const bad = { ...source };
    Object.defineProperty(bad, "nodes", { get() { throw new Error("executed"); } });
    expect(() => readFlowchart(bad)).toThrow(/unsupported field/);
  });
  it("remaps identities and references together for template insertion", () => {
    const copy = instantiateFlowchart(readFlowchart(source), "copy");
    expect(copy.nodes[0]?.id).toBe("copy-n0");
    expect(copy.edges[0]?.source).toEqual({ node: "copy-n0", port: "bottom" });
    expect(copy.revision).toBe(0);
  });
});
