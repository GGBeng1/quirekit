import { beforeAll, expect, it } from "vitest";
import { createFlowchartNode, flowchartShapes } from "@quirekit/flowchart";
import { shapeGeometry } from "./shapes";
import { nodeAttrs } from "../codec/nodes";
import { initializeDrawing } from "../drawing/rough";
beforeAll(initializeDrawing);
const appearance = { primary: "#123456", surface: "#ffffff", text: "#222222", line: "#888888", fontFamily: "sans-serif" };

it("projects every admitted symbol into finite local geometry at minimum and asymmetric sizes", () => {
  expect(flowchartShapes).toHaveLength(66);
  for (const shape of flowchartShapes) for (const [width, height] of [[20, 20], [160, 100], [80, 180]]) {
    const g = shapeGeometry({ shape, width: width!, height: height! });
    expect(g.outline).toMatch(/^M/); expect(g.outline).not.toMatch(/NaN|Infinity|undefined/);
    expect(g.detail).not.toMatch(/NaN|Infinity|undefined/);
    expect(g.textWidth).toBeGreaterThan(0); expect(g.textHeight).toBeGreaterThan(0);
    for (const p of Object.values(g.ports)) {
      expect(p.x).toBeGreaterThanOrEqual(-0.001); expect(p.x).toBeLessThanOrEqual(width! + 0.001);
      expect(p.y).toBeGreaterThanOrEqual(-0.001); expect(p.y).toBeLessThanOrEqual(height! + 0.001);
    }
  }
});

it("keeps free text frameless in every drawing style without losing its hit region or caption", () => {
  for (const drawing of ["standard", "sketch", "pencil"] as const) {
    const node = createFlowchartNode("text", "text", { x: 0, y: 0 }, "自由文字");
    const attrs = nodeAttrs({ ...node, style: { drawing } }, appearance);
    expect(attrs.body).toMatchObject({ fill: "transparent", stroke: "none" });
    expect(attrs.drawingOutline?.d).toBe(""); expect(attrs.drawingFill?.d).toBe("");
    expect(attrs.label?.text).toBe("自由文字");
  }
});

it("keeps open annotations unfilled and sequence frames transparent in every drawing style", () => {
  for (const shape of ["bracket-left", "bracket-right", "brace", "destruction", "phase-horizontal", "phase-vertical"] as const) {
    for (const drawing of ["standard", "sketch", "pencil"] as const) {
      const node = createFlowchartNode("open", shape, { x: 0, y: 0 }, "");
      const attrs = nodeAttrs({ ...node, style: { drawing } }, appearance);
      expect(attrs.body).toMatchObject({ fill: "transparent", stroke: "none" });
      expect(attrs.drawingFill?.d).toBe(""); expect(attrs.drawingOutline?.d).toBe(""); expect(attrs.detail?.d).toBeTruthy();
    }
  }
  for (const shape of ["sequence-alt", "sequence-opt", "sequence-loop"] as const) {
    const node = createFlowchartNode("frame", shape, { x: 0, y: 0 }, "alt");
    expect(nodeAttrs(node, appearance).body).toMatchObject({ fill: "transparent", pointerEvents: "stroke" });
  }
});
