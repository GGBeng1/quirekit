import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { arrangeFlowchart } from "./operations";

/** @returns Unequal shapes with one owned child and both internal and crossing bends. */
function fixture() {
  return { ...createFlowchart(), nodes: [
    { ...createFlowchartNode("a", "container", { x: 0, y: 0 }, "图形"), width: 160, height: 150 },
    { ...createFlowchartNode("child", "process", { x: 20, y: 60 }, "图形"), parent: "a", width: 80, height: 40 },
    { ...createFlowchartNode("b", "rectangle", { x: 250, y: 180 }, "图形"), width: 100, height: 80 },
    { ...createFlowchartNode("c", "rectangle", { x: 600, y: 300 }, "图形"), width: 200, height: 100 },
  ], edges: [
    { id: "internal", source: { node: "child" }, target: { node: "a" }, vertices: [{ x: 130, y: 90 }], routing: "straight" as const, label: "", labelPosition: 0.5, style: {} },
    { id: "external", source: { node: "child" }, target: { node: "b" }, vertices: [{ x: 200, y: 170 }], routing: "orthogonal" as const, label: "", labelPosition: 0.5, style: {} },
  ] };
}
describe("portable shape arrangement", () => {
  it("aligns outer selection roots and translates descendants and internal bends exactly once", () => {
    const source = fixture(), result = arrangeFlowchart(source, ["a", "child", "b", "c"], "align-bottom");
    expect(result.nodes.slice().filter(n => n.id !== "child").map(n => n.y + n.height)).toEqual([400, 400, 400]);
    expect(result.nodes[1]!.y).toBe(310);
    expect(result.edges[0]!.vertices).toEqual([{ x: 130, y: 340 }]);
    expect(result.edges[1]!.vertices).toEqual(source.edges[1]!.vertices);
    expect(source.nodes[0]!.y).toBe(0);
  });
  it("distributes equal outline gaps for mixed dimensions and never uses negative spacing", () => {
    const source = fixture(), result = arrangeFlowchart(source, ["a", "b", "c"], "distribute-horizontal");
    const [a,b,c] = result.nodes.filter(n => n.id !== "child");
    expect(b!.x - a!.x - a!.width).toBe(c!.x - b!.x - b!.width);
    const overlap = { ...source, nodes: source.nodes.map(n => ({ ...n, x: 0 })) };
    const packed = arrangeFlowchart(overlap, ["a", "b", "c"], "distribute-horizontal");
    expect(packed.nodes.filter(n => n.id !== "child").map(n => n.x)).toEqual([0,160,260]);
  });
  it("equalizes leaf dimensions without shrinking or resizing structural participants", () => {
    const result = arrangeFlowchart(fixture(), ["b", "c"], "size-both");
    expect(result.nodes.filter(n => ["b","c"].includes(n.id)).map(n => [n.width,n.height])).toEqual([[200,100],[200,100]]);
    expect(() => arrangeFlowchart(fixture(), ["a","b"], "size-both")).toThrow();
  });
  it("rejects insufficient, unknown or cross-owner selections without changing source", () => {
    expect(() => arrangeFlowchart(fixture(), ["b"], "align-left")).toThrow();
    expect(() => arrangeFlowchart(fixture(), ["a","b"], "distribute-horizontal")).toThrow();
    expect(() => arrangeFlowchart(fixture(), ["child","b"], "align-left")).toThrow();
    expect(() => arrangeFlowchart(fixture(), ["b","c"], "invalid" as never)).toThrow();
  });
});
