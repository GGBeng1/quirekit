import { beforeAll, expect, it } from "vitest";
import { createFlowchartNode, flowchartShapes } from "@quirekit/flowchart";
import { initializeDrawing, sketchPaths } from "./rough";
import { toX6Node } from "../codec/nodes";
import { shapeGeometry } from "../geometry/shapes";

beforeAll(initializeDrawing);
const appearance = { primary: "#2563eb", surface: "#ffffff", text: "#111111", line: "#888888", fontFamily: "sans-serif" };
it.each(flowchartShapes.filter(shape => shape !== "image"))("renders %s as stable vectors across movement and theme changes", shape => {
  const node = { ...createFlowchartNode("stable-id", shape, { x: 0, y: 0 }, "中文"), style: { drawing: "pencil" as const } };
  const first = toX6Node(node, appearance), moved = toX6Node({ ...node, x: 900, y: -100 }, { ...appearance, primary: "#ff0000" });
  expect(first.attrs?.drawingOutline?.d).toBe(moved.attrs?.drawingOutline?.d);
  expect(first.attrs?.drawingFill?.d).toBe(moved.attrs?.drawingFill?.d);
  if (!shapeGeometry(node).visible) expect(first.attrs?.drawingFill?.d).toBe("");
  else expect(first.attrs?.drawingFill?.d).toContain("M");
  expect(first.attrs?.drawingOutline?.d).not.toBe(first.attrs?.body?.d);
  expect(String(first.attrs?.drawingOutline?.d)).not.toMatch(/NaN|Infinity/);
  expect(first.data.source).toEqual(node);
});
it("bounds hatch work for huge shapes and preserves exact circle attachments", () => {
  const geometry = shapeGeometry({ shape: "circle", width: 200, height: 100 });
  expect(geometry.ports.left).toEqual({ x: 50, y: 50 });
  expect(geometry.ports.right).toEqual({ x: 150, y: 50 });
  const large = shapeGeometry({ shape: "rectangle", width: 10000, height: 10000 });
  expect(sketchPaths(large.outline, "large", "pencil", 1.5, 10000, true).fill.length).toBeLessThan(100000);
});
