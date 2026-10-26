import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { moveFlowchartSelection } from "./move";
import type { FlowchartDocument, FlowchartEdge } from "../model/types";
/** @returns Nested world-space selection with one internal and one external bend. */
function sample(): FlowchartDocument {
  const node = createFlowchartNode;
  const edge: FlowchartEdge = { id: "ab", source: { node: "a" }, target: { node: "b" }, vertices: [{ x: 200, y: 140 }], routing: "orthogonal", label: "", labelPosition: 0.5, style: {} };
  return { ...createFlowchart(), nodes: [{ ...node("g", "group", { x: 0, y: 0 }, ""), width: 500, height: 400 },
    { ...node("a", "process", { x: 50, y: 70 }, "A"), parent: "g" }, { ...node("b", "process", { x: 270, y: 70 }, "B"), parent: "g" }, node("c", "process", { x: 800, y: 70 }, "C")],
    edges: [edge, { ...edge, id: "bc", source: { node: "b" }, target: { node: "c" } }] };
}
describe("selection movement", () => {
  it("moves nested selection once and translates only wholly moved bends", () => {
    const source = sample(), after = moveFlowchartSelection(source, ["g", "a", "ab"], { x: 10, y: -1 });
    expect(after.nodes.map(n => n.x)).toEqual([10, 60, 280, 800]);
    expect(after.edges[0]!.vertices).toEqual([{ x: 210, y: 139 }]);
    expect(after.edges[1]).toEqual(source.edges[1]); expect(source.nodes[0]!.x).toBe(0);
  });
  it("rejects descendant and incident-edge locks before moving any cell", () => {
    const source = sample();
    expect(() => moveFlowchartSelection({ ...source, nodes: source.nodes.map(n => n.id === "a" ? { ...n, locked: true } : n) }, ["g"], { x: 1, y: 0 })).toThrow(/锁定/);
    expect(() => moveFlowchartSelection({ ...source, edges: source.edges.map(e => ({ ...e, locked: true })) }, ["a"], { x: 1, y: 0 })).toThrow(/锁定/);
  });
  it("preserves parent boundaries and rejects invalid coordinates atomically", () => {
    const source = sample();
    expect(() => moveFlowchartSelection(source, ["a"], { x: -100, y: 0 })).toThrow(/容器/);
    expect(() => moveFlowchartSelection(source, ["g"], { x: Infinity, y: 0 })).toThrow();
    expect(() => moveFlowchartSelection(source, ["g"], { x: 1e6, y: 0 })).toThrow();
  });
  it("translates free edges without detaching attached endpoints", () => {
    const source = sample(), free = { ...source.edges[0]!, id: "free", source: { x: 20, y: 30 }, target: { x: 200, y: 300 } };
    const after = moveFlowchartSelection({ ...source, edges: [free] }, ["free"], { x: 1, y: 10 });
    expect(after.edges[0]).toMatchObject({ source: { x: 21, y: 40 }, target: { x: 201, y: 310 } });
    expect(() => moveFlowchartSelection(source, ["ab"], { x: 1, y: 0 })).toThrow(/端点/);
  });
  it("keeps sequence axes and activation range under structural ownership", () => {
    const source = { ...createFlowchart(), nodes: [createFlowchartNode("p", "lifeline", { x: 0, y: 0 }, "服务")] };
    expect(moveFlowchartSelection(source, ["p"], { x: 10, y: 0 }).nodes[0]!.x).toBe(10);
    expect(() => moveFlowchartSelection(source, ["p"], { x: 0, y: 1 })).toThrow(/横向/);
  });
});
