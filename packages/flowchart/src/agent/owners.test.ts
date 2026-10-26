import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { readFlowchart } from "../model/document";
import type { FlowchartDocument } from "../model/types";
import { editFlowchartDiagram } from "./edit";

/** @returns Pool with two horizontal lanes 30px apart, one task in each. */
function fixture(): FlowchartDocument {
  const pool = { ...createFlowchartNode("pool", "container", { x: 0, y: 0 }, "架构"), width: 560, height: 520 };
  const a = { ...createFlowchartNode("a", "lane-horizontal", { x: 30, y: 70 }, "入口"), parent: "pool", width: 500, height: 180 };
  const b = { ...a, id: "b", y: 280, text: "服务" };
  const task = { ...createFlowchartNode("task", "process", { x: 200, y: 120 }, "网关"), width: 210, height: 80, parent: "a", style: { fill: "#f5f3ff" } };
  const other = { ...task, id: "other", y: 330, text: "认证", parent: "b" };
  return readFlowchart({ ...createFlowchart(), nodes: [pool, a, b, task, other], edges: [] });
}

/** @param graph - Graph. @param id - Node id. @returns That node. */
const node = (graph: FlowchartDocument, id: string) => graph.nodes.find(item => item.id === id)!;

describe("Agent flowchart edits inside lanes and containers", () => {
  it("places a lane member after its predecessor in its style and widens the whole lane group", () => {
    const next = editFlowchartDiagram(fixture(), {
      nodes: [{ id: "notify", text: "通知", parent: "a" }],
      edges: [{ id: "flow", from: "task", to: "notify" }]
    });
    expect(node(next, "notify")).toMatchObject({ x: 458, y: 120, width: 210, height: 80, parent: "a", style: { fill: "#f5f3ff" } });
    expect(node(next, "a").width).toBe(668 + 24 - 30);
    expect(node(next, "b")).toMatchObject({ y: 280, width: node(next, "a").width });
    expect(node(next, "pool").width).toBeGreaterThanOrEqual(30 + node(next, "a").width);
  });

  it("grows a lane that a moved node overflows and pushes later lanes, keeping their gap", () => {
    const next = editFlowchartDiagram(fixture(), { nodes: [{ id: "task", y: 200 }] });
    expect(node(next, "a").height).toBe(200 + 80 + 24 - 70);
    expect(node(next, "b").y).toBe(280 + node(next, "a").height - 180);
    expect(node(next, "other").y).toBe(330 + node(next, "a").height - 180);
    expect(node(next, "pool").height).toBeGreaterThanOrEqual(node(next, "b").y + 180);
  });

  it("explains that lanes size themselves and names the least position an owner accepts", () => {
    expect(() => editFlowchartDiagram(fixture(), { nodes: [{ id: "a", width: 900 }] })).toThrow("自动调整");
    expect(() => editFlowchartDiagram(fixture(), { nodes: [{ id: "task", x: 40 }] })).toThrow("x 至少为 134");
  });
});
