import { describe, expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { addConnectedFlowchartNode } from "./connected";
import { flowchartNodeBounds, flowchartNodePoint } from "../transform/geometry";
import type { FlowchartDirection } from "./types";
/** @returns One styled ordinary source. */
function sample() { return { ...createFlowchart(), nodes: [{ ...createFlowchartNode("a", "note", { x: 100, y: 100 }, "想法"), style: { fill: "#fff8e7", drawing: "pencil" as const } }] }; }
describe("connected creation", () => {
  it("creates canonical editable shape and connector without copying identities or source text", () => {
    const source = sample(), after = addConnectedFlowchartNode(source, "a", { direction: "right", shape: "decision" }, "b", "ab");
    expect(after.nodes[1]).toMatchObject({ id: "b", shape: "decision", text: "新图形", style: source.nodes[0]!.style });
    expect(after.edges[0]).toMatchObject({ source: { node: "a" }, target: { node: "b" }, routing: "orthogonal", connector: "rounded", style: { drawing: "pencil", targetArrow: "block" } });
    expect(source.nodes).toHaveLength(1);
  });
  it("finds bounded empty space while preserving parent ownership", () => {
    const base = sample(), source = { ...base, nodes: [{ ...createFlowchartNode("p", "container", { x: 0, y: 0 }, "架构"), width: 1000, height: 800 }, { ...base.nodes[0]!, parent: "p" }, { ...createFlowchartNode("obstacle", "process", { x: 340, y: 100 }, "已有"), parent: "p" }] };
    const after = addConnectedFlowchartNode(source, "a", { direction: "right", shape: "same" }, "b", "ab"), next = after.nodes[3]!;
    expect(next.parent).toBe("p"); expect(next.y).not.toBe(100); expect(next.x).toBeGreaterThan(260);
    expect(() => addConnectedFlowchartNode({ ...source, nodes: source.nodes.map(n => n.id === "p" ? { ...n, width: 300, height: 210 } : n) }, "a", { direction: "right", shape: "same" }, "b", "ab")).toThrow(/空间/);
  });
  it("keeps direction in world coordinates for rotated mirrored sources", () => {
    const base = sample(), source = { ...base, nodes: [{ ...base.nodes[0]!, rotation: 90, flipX: true }] };
    const after = addConnectedFlowchartNode(source, "a", { direction: "right", shape: "same" }, "b", "ab");
    const anchor = after.edges[0]!.source; if (!("node" in anchor) || !anchor.anchor) throw new Error("Expected anchor");
    const start = flowchartNodePoint(source.nodes[0]!, { x: anchor.anchor.x * source.nodes[0]!.width, y: anchor.anchor.y * source.nodes[0]!.height });
    expect(start.x).toBeGreaterThan(source.nodes[0]!.x + source.nodes[0]!.width / 2);
    expect(start.y).toBeCloseTo(source.nodes[0]!.y + source.nodes[0]!.height / 2);
    const box = flowchartNodeBounds(source.nodes[0]!); expect(after.nodes[1]!.x).toBeGreaterThan(box.x + box.width);
  });
  it("rejects locks, structures, reused ids and unsupported directions atomically", () => {
    const source = sample();
    expect(() => addConnectedFlowchartNode({ ...source, nodes: source.nodes.map(n => ({ ...n, locked: true })) }, "a", { direction: "right", shape: "same" }, "b", "ab")).toThrow(/锁定/);
    expect(() => addConnectedFlowchartNode(source, "a", { direction: "right", shape: "lifeline" }, "b", "ab")).toThrow(/普通/);
    expect(() => addConnectedFlowchartNode(source, "a", { direction: "right", shape: "same" }, "a", "ab")).toThrow();
    expect(() => addConnectedFlowchartNode(source, "a", { direction: "diagonal" as FlowchartDirection, shape: "same" }, "b", "ab")).toThrow();
  });
});
