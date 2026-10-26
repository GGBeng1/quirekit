import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode, parseFlowchart, readFlowchart, serializeFlowchart } from "../index";

const added = ["rectangle", "circle", "triangle", "hexagon", "cloud", "note", "subprocess", "database", "manual-input", "delay", "display", "off-page"];
const base = createFlowchartNode("node", "process", { x: 0, y: 0 }, "中文");
describe("drawing extension admission", () => {
  it.each(added)("roundtrips the %s shape with persistent pencil strokes", shape => {
    const raw = { ...createFlowchart(), nodes: [{ ...base, shape, style: { drawing: "pencil" } }] };
    expect(parseFlowchart(serializeFlowchart(readFlowchart(raw)))).toEqual(raw);
  });
  it.each(["sharp", "rounded", "smooth"])("preserves %s connectors, markers, manual bends and legacy fields", connector => {
    const raw = { ...createFlowchart(), nodes: [base], edges: [{ id: "edge", source: { node: "node", port: "right" }, target: { x: 500, y: 20 },
      routing: "straight", connector, vertices: [{ x: 240, y: 130 }], label: "返回", labelPosition: 0.4,
      style: { drawing: "sketch", sourceArrow: "circle", targetArrow: "diamond", dashed: true, width: 3 } }] };
    expect(parseFlowchart(serializeFlowchart(readFlowchart(raw)))).toEqual(raw);
  });
  it("does not add defaults or drop unsupported drawing semantics", () => {
    const legacy = { ...createFlowchart(), nodes: [base] };
    expect(readFlowchart(legacy)).toEqual(legacy);
    for (const drawing of ["future", null, 1]) expect(() => readFlowchart({ ...legacy, nodes: [{ ...base, style: { drawing } }] })).toThrow();
  });
  it("rejects future routing, corners and marker names", () => {
    const edge = { id: "e", source: { x: 0, y: 0 }, target: { x: 200, y: 200 }, vertices: [], routing: "straight", label: "", labelPosition: 0.5, style: {} };
    for (const extra of [{ connector: "future" }, { routing: "future" }, { style: { targetArrow: "future" } }]) {
      expect(() => readFlowchart({ ...createFlowchart(), edges: [{ ...edge, ...extra }] })).toThrow();
    }
  });
});
