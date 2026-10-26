import { describe, expect, it } from "vitest";
import { createFlowchart } from "../model/create";
import { editFlowchartDiagram } from "./edit";

describe("Agent flowchart edits", () => {
  it("creates a laid-out graph, then changes, connects and removes by id", () => {
    const created = editFlowchartDiagram(createFlowchart(), {
      nodes: [{ id: "a", text: "申请" }, { id: "b", text: "审核", shape: "decision" }, { id: "c", text: "发布", shape: "terminator" }],
      edges: [{ id: "ab", from: "a", to: "b" }, { id: "bc", from: "b", to: "c", label: "通过" }]
    });
    const [a, b, c] = ["a", "b", "c"].map(id => created.nodes.find(node => node.id === id)!);
    expect(a!.y).toBeLessThan(b!.y);
    expect(b!.y).toBeLessThan(c!.y);
    expect(created.revision).toBe(0);

    const changed = editFlowchartDiagram(created, {
      nodes: [{ id: "b", text: "复核" }, { id: "d", text: "归档" }],
      edges: [{ id: "cd", from: "c", to: "d" }, { id: "bc", label: "同意" }],
      remove: ["ab"]
    });
    expect(changed.nodes.find(node => node.id === "b")).toMatchObject({ text: "复核", shape: "decision", x: b!.x, y: b!.y });
    expect(changed.edges.map(edge => edge.id)).toEqual(["bc", "cd"]);
    expect(changed.edges.find(edge => edge.id === "bc")?.label).toBe("同意");
    const d = changed.nodes.find(node => node.id === "d")!;
    expect(changed.nodes.filter(node => node.id !== "d").every(node => node.x + node.width <= d.x || d.x + d.width <= node.x
      || node.y + node.height <= d.y || d.y + d.height <= node.y)).toBe(true);
  });

  it("sets class members and refuses unknown ids", () => {
    const graph = editFlowchartDiagram(createFlowchart(), { nodes: [{ id: "order", text: "Order", shape: "uml-class", attributes: ["+ id: string"], operations: ["+ pay(): void"] }] });
    expect(graph.nodes[0]!.uml).toEqual({ attributes: ["+ id: string"], operations: ["+ pay(): void"] });
    expect(() => editFlowchartDiagram(graph, { remove: ["missing"] })).toThrow("missing");
    expect(() => editFlowchartDiagram(graph, { edges: [{ id: "x", from: "order", to: "nowhere" }] })).toThrow("nowhere");
  });

  it("attaches the branches of a decision to distinct sides", () => {
    const graph = editFlowchartDiagram(createFlowchart(), {
      nodes: [{ id: "q", text: "是否通过", shape: "decision" }, { id: "y", text: "发布" }, { id: "n", text: "退回" }],
      edges: [{ id: "yes", from: "q", to: "y", label: "同意" }, { id: "no", from: "q", to: "n", label: "不同意" }]
    });
    const ports = graph.edges.map(edge => "node" in edge.source ? edge.source.port : undefined);
    expect(new Set(ports).size).toBe(2);
    expect(ports.every(Boolean)).toBe(true);
    expect(graph.edges.every(edge => "node" in edge.target && edge.target.port === "top")).toBe(true);
    const single = editFlowchartDiagram(createFlowchart(), { nodes: [{ id: "a" }, { id: "b" }], edges: [{ id: "ab", from: "a", to: "b" }] });
    expect(single.edges[0]!.source).toEqual({ node: "a" });
  });
});
