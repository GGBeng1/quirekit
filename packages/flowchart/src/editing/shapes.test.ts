import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { replaceFlowchartShapes } from "./shapes";
/** @returns Linked ordinary nodes with explicit transforms and style. */
function sample() { return { ...createFlowchart(), nodes: [
  { ...createFlowchartNode("a", "note", { x: 100, y: 100 }, "保留文字"), rotation: 30, flipX: true, style: { fill: "#ff8800", bold: true } },
  createFlowchartNode("b", "process", { x: 500, y: 100 }, "下一步"),
], edges: [{ id: "e", source: { node: "a", port: "right" as const }, target: { node: "b", anchor: { x: 0.2, y: 0.8 } }, vertices: [{ x: 300, y: 40 }], label: "原路径", labelPosition: 0.4, routing: "orthogonal" as const, style: {} }] }; }
describe("replace ordinary shapes", () => {
  it("changes only shape for every selected node, preserving identity, transforms and connections", () => {
    const source = sample(), after = replaceFlowchartShapes(source, ["a", "b"], "decision");
    expect(after).toEqual({ ...source, nodes: source.nodes.map(n => ({ ...n, shape: "decision" })) });
    expect(source.nodes[0]!.shape).toBe("note"); expect(after.edges).toBe(source.edges);
  });
  it("rejects structural shapes, unknown targets and edge selections atomically", () => {
    const source = sample();
    for (const shape of ["group", "er-entity", "uml-class", "activation", "lifeline", "lane-horizontal", "made-up"]) expect(() => replaceFlowchartShapes(source, ["a"], shape as "note")).toThrow();
    for (const ids of [[], ["a", "e"], ["missing"]]) expect(() => replaceFlowchartShapes(source, ids, "circle")).toThrow();
    expect(() => replaceFlowchartShapes({ ...source, nodes: [...source.nodes, createFlowchartNode("g", "group", { x: 0, y: 0 }, "")] }, ["g"], "circle")).toThrow(/结构/);
  });
  it("checks both inherited and incident locks and preserves parent ownership", () => {
    const source = sample(), nested = { ...source, nodes: [createFlowchartNode("g", "group", { x: 0, y: 0 }, ""), ...source.nodes.map(n => ({ ...n, parent: "g" }))] };
    expect(replaceFlowchartShapes(nested, ["a"], "ellipse").nodes[1]!.parent).toBe("g");
    expect(() => replaceFlowchartShapes({ ...nested, nodes: nested.nodes.map(n => n.id === "g" ? { ...n, locked: true } : n) }, ["a"], "circle")).toThrow(/锁定/);
    expect(() => replaceFlowchartShapes({ ...source, edges: source.edges.map(e => ({ ...e, locked: true })) }, ["a"], "circle")).toThrow(/锁定/);
  });
  it("replacing with the existing shape is a no-op", () => { const source = sample(); expect(replaceFlowchartShapes(source, ["a"], "note")).toBe(source); });
});
