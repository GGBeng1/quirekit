import type { FlowchartEdge } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "./build";
import { recipeTones } from "../recipes/palette";
import type { RecipeTone } from "../recipes/types";

/** @returns A horizontal timeline with alternating events anchored to real milestone nodes. */
export function milestonesDiagram() {
  const nodes = [diagramNode("title", "text", "产品发布 · 里程碑", 310, -30, 480, 60, "slate", { fontSize: 28, bold: true })];
  const edges: FlowchartEdge[] = [];
  const events = ["01 月 · 调研\n访谈与需求收集", "02 月 · 定义\n范围与目标确认", "03 月 · 设计\n方案与原型验证", "04 月 · 开发\n迭代与集成测试", "05 月 · 发布\n灰度与质量观察", "06 月 · 复盘\n反馈与后续规划"];
  const tones: readonly RecipeTone[] = ["blue", "purple", "green", "orange", "blue", "green"];
  events.forEach((text, i) => {
    const x = 90 + i * 184, upper = i % 2 === 0, tone = tones[i]!, id = `milestone-${i}`;
    nodes.push(diagramNode(id, "circle", `0${i + 1}`, x - 20, 230, 40, 40, tone, { bold: true, fontSize: 12 }),
      diagramNode(`event-${i}`, "text", text, x - 90, upper ? 85 : 333, 180, 82, tone, { fontSize: 17 }));
    if (i) edges.push(diagramEdge(`axis-${i}`, { node: `milestone-${i - 1}`, port: "right" }, { node: id, port: "left" }, { style: { width: 3 } }));
    edges.push(diagramEdge(`stem-${i}`, { node: id, port: upper ? "top" : "bottom" }, { node: `event-${i}`, port: upper ? "bottom" : "top" }, { style: { stroke: recipeTones[tone].stroke, width: 2 } }));
  });
  return diagram(nodes, edges);
}
