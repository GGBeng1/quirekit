import { expect, it } from "vitest";
import { createFlowchartNode, type FlowchartEdge } from "@quirekit/flowchart";
import { createSelectionStyleReader } from "./selection";

const theme = { primary: "#2563eb", surface: "#ffffff", text: "#111111", line: "#888888", fontFamily: "sans-serif" };
const node = createFlowchartNode("a", "process", { x: 0, y: 0 }, "A");
const edge: FlowchartEdge = { id: "e", source: { node: "a" }, target: { x: 250, y: 0 }, vertices: [], routing: "orthogonal", label: "", labelPosition: 0.5, style: {} };

it("projects effective defaults and distinguishes mixed selected properties", () => {
  const read = createSelectionStyleReader();
  expect(read([node], [edge], theme)).toMatchObject({ nodeCount: 1, edgeCount: 1, fill: "#ffffff", color: "#111111", stroke: null,
    width: 1.5, dashed: false, routing: "orthogonal", connector: "rounded", sourceArrow: "none", targetArrow: "block" });
  expect(read([node, { ...node, id: "b", style: { fill: "#FF0000" } }], [], theme).fill).toBeNull();
  expect(read([{ ...node, style: { fill: "#abcdef" } }, { ...node, id: "b", style: { fill: "#ABCDEF" } }], [], theme).fill).toBe("#abcdef");
});

it("reuses formatting until source or appearance changes, without geometry or graph access", () => {
  const read = createSelectionStyleReader(), first = read([node], [edge], theme);
  expect(read([node], [edge], theme)).toBe(first);
  expect(read([node], [edge], { ...theme, surface: "#101010" })).not.toBe(first);
  const changed = { ...edge, style: { dashed: true } };
  expect(read([node], [changed], theme).dashed).toBe(true);
  const empty = read([], [], theme);
  expect(empty).toMatchObject({ nodeCount: 0, edgeCount: 0, fill: null, stroke: null, width: null });
  expect(read([], [], theme)).toBe(empty);
});
