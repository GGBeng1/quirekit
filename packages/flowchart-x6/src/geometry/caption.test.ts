import { expect, it } from "vitest";
import { createFlowchartNode, readFlowchart } from "@quirekit/flowchart";
import { captionLayout } from "./caption";
import { shapeGeometry } from "./shapes";
import { nodeAttrs } from "../codec/nodes";
const theme = { primary: "#2563eb", surface: "#ffffff", text: "#111111", line: "#888888", fontFamily: "sans-serif" };
it("positions aligned text within the safe contour area and preserves absent-field geometry", () => {
  const node = createFlowchartNode("a", "process", { x: 0, y: 0 }, "中文\n第二行"), g = shapeGeometry(node);
  expect(captionLayout(node)).toMatchObject({ x: g.textX, y: g.textY, width: g.textWidth, height: g.textHeight });
  const styled = { ...node, style: { textAlign: "left" as const, verticalAlign: "top" as const, padding: 8, fontSize: 17.5 } };
  const c = captionLayout(styled), attrs = nodeAttrs(styled, theme);
  expect(c.x).toBe(g.textX - g.textWidth / 2 + 8); expect(c.y).toBe(g.textY - g.textHeight / 2 + 8);
  expect(attrs.label).toMatchObject({ fontSize: 17.5, textAnchor: "start", textVerticalAnchor: "top", x: c.x, y: c.y });
});
it("clamps large padding within tiny irregular shapes and structural headers", () => {
  for (const shape of ["decision", "triangle", "note", "lifeline", "lane-vertical"] as const) {
    const node = { ...createFlowchartNode("a", shape, { x: 0, y: 0 }, "字"), width: 20, height: 20, style: { padding: 80, textAlign: "right" as const, verticalAlign: "bottom" as const } };
    const c = captionLayout(node);
    expect(c.width).toBeGreaterThan(0); expect(c.height).toBeGreaterThan(0); expect(c.x).toBeLessThanOrEqual(20); expect(c.y).toBeLessThanOrEqual(20);
  }
});
it("validates portable typography without accepting unknown alignment or unbounded padding", () => {
  const n = createFlowchartNode("a", "process", { x: 0, y: 0 }, "字");
  for (const style of [{ textAlign: "justify" }, { verticalAlign: "baseline" }, { padding: -1 }, { padding: 81 }, { fontSize: 9 }])
    expect(() => readFlowchart({ format: "quirekit-flowchart", version: 1, revision: 0, nodes: [{ ...n, style }], edges: [] })).toThrow();
});
