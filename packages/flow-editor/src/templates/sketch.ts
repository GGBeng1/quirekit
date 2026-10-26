import { createFlowchart, createFlowchartNode, readFlowchart, type FlowchartDocument, type FlowchartEdge, type FlowchartNode } from "@quirekit/flowchart";

/** @returns An editable planning diagram demonstrating pencil fills, meaningful shapes and mixed connection geometry. */
export function createSketchTemplate(): FlowchartDocument {
  const nodes: FlowchartNode[] = [
    { ...createFlowchartNode("idea", "cloud", { x: 60, y: 180 }, "一个好想法"), style: { drawing: "pencil", stroke: "#64748b", fill: "#f8fafc", color: "#334155" } },
    { ...createFlowchartNode("plan", "note", { x: 310, y: 70 }, "梳理目标\n记录灵感"), height: 100, style: { drawing: "pencil", stroke: "#c18a38", fill: "#fffbeb", color: "#78350f" } },
    { ...createFlowchartNode("research", "database", { x: 310, y: 290 }, "收集资料"), style: { drawing: "pencil", stroke: "#5b9b86", fill: "#f0fdf4", color: "#14532d" } },
    { ...createFlowchartNode("build", "subprocess", { x: 570, y: 190 }, "制作原型"), height: 80, style: { drawing: "sketch", stroke: "#7c75bd", fill: "#f5f3ff", color: "#4c1d95" } },
    { ...createFlowchartNode("review", "decision", { x: 825, y: 180 }, "可以发布？"), style: { drawing: "pencil", stroke: "#658fbb", fill: "#eff6ff", color: "#1e3a8a" } },
    { ...createFlowchartNode("done", "terminator", { x: 825, y: 390 }, "发布与回顾"), style: { drawing: "sketch", stroke: "#5b9b86", fill: "#f0fdf4", color: "#14532d" } },
  ];
  const edges: FlowchartEdge[] = [];
  /** @param from - Source node. @param to - Target node. @param label - Caption. @param vertical - Whether attachments point vertically. */
  function link(from: string, to: string, label = "", vertical = false): void {
    edges.push({ id: `e${edges.length}`, source: { node: from, port: vertical ? "bottom" : "right" }, target: { node: to, port: vertical ? "top" : "left" },
      vertices: [], routing: "straight", connector: "smooth", label, labelPosition: 0.5, style: { drawing: "sketch", stroke: "#64748b", targetArrow: "open" } });
  }
  link("idea", "plan"); link("idea", "research"); link("plan", "build"); link("research", "build"); link("build", "review"); link("review", "done", "是", true);
  edges.push({ id: "feedback", source: { node: "review", port: "top" }, target: { node: "plan", port: "top" },
    vertices: [{ x: 905, y: 0 }, { x: 390, y: 0 }], routing: "orthogonal", connector: "rounded", label: "再打磨一下", labelPosition: 0.5,
    style: { drawing: "sketch", dashed: true, stroke: "#94a3b8", targetArrow: "open" } });
  return readFlowchart({ ...createFlowchart(), nodes, edges });
}
