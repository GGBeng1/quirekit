import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { setFlowchartGeometry } from "./properties";
/** @returns Two leaves with deliberately different coordinates and style. */
function sample() { return { ...createFlowchart(), nodes: [createFlowchartNode("a", "note", { x: 100, y: 100 }, "A"), { ...createFlowchartNode("b", "process", { x: 400, y: 100 }, "B"), style: { fill: "#ff0000" } }] }; }
describe("precise geometry", () => {
  it("sets only explicit fields on multiple roots and preserves unedited values", () => {
    const source = sample(), after = setFlowchartGeometry(source, ["a", "b"], { width: 210.5, rotation: 45 });
    expect(after.nodes.map(n => n.width)).toEqual([210.5, 210.5]); expect(after.nodes.map(n => n.rotation)).toEqual([45, 45]);
    expect(after.nodes.map(n => n.x)).toEqual([100, 400]); expect(after.nodes[1]!.style).toEqual({ fill: "#ff0000" });
    expect(source.nodes[0]!.width).toBe(160);
  });
  it("translates nested members once and rejects structural resizing or ancestor overflow", () => {
    const source = sample(), group = { ...createFlowchartNode("g", "group", { x: 0, y: 0 }, ""), width: 700, height: 400 };
    const nested = { ...source, nodes: [group, ...source.nodes.map(n => ({ ...n, parent: "g" }))] };
    const after = setFlowchartGeometry(nested, ["g", "a"], { x: 50, y: 30 });
    expect(after.nodes.map(n => n.x)).toEqual([50, 150, 450]);
    expect(() => setFlowchartGeometry(nested, ["g"], { width: 100 })).toThrow(/结构/);
    expect(() => setFlowchartGeometry(nested, ["a"], { x: -10 })).toThrow(/容器/);
  });
  it("rejects invalid values and dependent locks without mutating source", () => {
    const source = sample();
    for (const patch of [{ width: 0 }, { x: NaN }, { rotation: 360 }, { y: Infinity }]) expect(() => setFlowchartGeometry(source, ["a"], patch)).toThrow();
    expect(() => setFlowchartGeometry({ ...source, nodes: source.nodes.map(n => ({ ...n, locked: true })) }, ["a", "b"], { x: 10 })).toThrow(/锁定/);
  });
});
