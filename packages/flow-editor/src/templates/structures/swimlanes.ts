import type { FlowchartNode } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "../diagrams/build";
import type { RecipeTone } from "../recipes/types";

/** @param vertical - Whether lanes run vertically. @returns A cross-functional approval graph with persistent lane membership. */
export function swimlaneTemplate(vertical: boolean) {
  const nodes: FlowchartNode[] = [{ ...diagramNode("pool", "container", "跨部门审批协作", 0, 0, vertical ? 1050 : 1140, vertical ? 780 : 675), style: { bold: true, fontSize: 22, stroke: "#94a3b8" } }];
  (["申请人", "审批人", "执行系统"] as const).forEach((label, i) => {
    nodes.push({ ...diagramNode(`lane-${i}`, vertical ? "lane-vertical" : "lane-horizontal", label,
      vertical ? 30 + i * 330 : 30, vertical ? 80 : 85 + i * 185, vertical ? 330 : 1080, vertical ? 670 : 185),
      style: { fontSize: 19, bold: true, stroke: "#94a3b8" }, parent: "pool" });
  });
  /** @param id - Shape ID. @param text - Caption. @param lane - Owner index. @param x - Horizontal-layout left. @param y - Horizontal-layout top. @param vx - Vertical-layout left. @param vy - Vertical-layout top. @param tone - Palette family. @param decision - Whether this is a decision. */
  function step(id: string, text: string, lane: number, x: number, y: number, vx: number, vy: number, tone: RecipeTone, decision = false): void {
    nodes.push({ ...diagramNode(id, decision ? "decision" : "process", text, vertical ? vx : x, vertical ? vy : y, 160, decision ? 100 : 68, tone), parent: `lane-${lane}` });
  }
  step("submit", "提交申请", 0, 190, 145, 115, 170, "blue");
  step("review", "核对申请内容", 1, 415, 335, 445, 290, "purple");
  step("decision", "审批通过？", 1, 675, 318, 445, 445, "orange", true);
  step("revise", "补充说明", 0, 870, 145, 115, 450, "blue");
  step("archive", "执行并归档", 2, 870, 520, 775, 570, "green");
  return diagram(nodes, [
    diagramEdge("submit-review", { node: "submit", port: "right" }, { node: "review", port: "left" }, { routing: "orthogonal", connector: "rounded", style: { targetArrow: "block" } }),
    diagramEdge("review-decision", { node: "review", port: vertical ? "bottom" : "right" }, { node: "decision", port: vertical ? "top" : "left" }, { routing: "orthogonal", connector: "rounded", style: { targetArrow: "block" } }),
    diagramEdge("approved", { node: "decision", port: vertical ? "right" : "bottom" }, { node: "archive", port: "left" }, { routing: "orthogonal", connector: "rounded", label: "通过", style: { targetArrow: "block" } }),
    diagramEdge("rejected", { node: "decision", port: vertical ? "left" : "top" }, { node: "revise", port: vertical ? "right" : "bottom" }, { routing: "orthogonal", connector: "rounded", label: "退回", style: { targetArrow: "open", dashed: true } }),
    diagramEdge("resubmit", { node: "revise", port: vertical ? "top" : "left" }, { node: "submit", port: vertical ? "bottom" : "right" }, { routing: "orthogonal", connector: "rounded", label: "重新提交", style: { targetArrow: "open", dashed: true } }),
  ]);
}
