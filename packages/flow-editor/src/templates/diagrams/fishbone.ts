import type { FlowchartEdge } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "./build";
import { recipeTones } from "../recipes/palette";
import type { RecipeTone } from "../recipes/types";

/** @returns A six-branch cause/effect diagram with visible, movable junctions. */
export function fishboneDiagram() {
  const nodes = [diagramNode("title", "text", "交付延期 · 原因分析", 340, -20, 480, 56, "slate", { fontSize: 25, bold: true }),
    diagramNode("tail", "circle", "", 30, 340, 20, 20, "slate"),
    diagramNode("effect", "process", "交付延期", 1040, 303, 180, 94, "orange", { fontSize: 22, bold: true })];
  const edges: FlowchartEdge[] = [];
  const branches: readonly (readonly [string, RecipeTone, readonly string[]])[] = [
    ["人员", "blue", ["职责不清", "人手不足"]], ["方法", "purple", ["评审不足", "流程冗长"]], ["工具", "orange", ["环境不稳定", "自动化不足"]],
    ["协作", "green", ["反馈滞后", "依赖未对齐"]], ["需求", "blue", ["范围变化", "验收不清晰"]], ["管理", "purple", ["风险遗漏", "排期不合理"]],
  ];
  for (let i = 0; i < 3; i++) {
    nodes.push(diagramNode(`spine-${i}`, "circle", "", 320 + i * 300, 340, 20, 20, "slate"));
    edges.push(diagramEdge(`axis-${i}`, { node: i ? `spine-${i - 1}` : "tail", port: "right" }, { node: `spine-${i}`, port: "left" }, { style: { width: 3 } }));
  }
  edges.push(diagramEdge("axis-effect", { node: "spine-2", port: "right" }, { node: "effect", port: "left" }, { style: { width: 3, targetArrow: "block" } }));
  // The bones are segmented at visible junction nodes, not at detached free
  // coordinates. Each subcause stays attached when its junction is dragged.
  branches.forEach(([label, tone, causes], i) => {
    const upper = i < 3, column = i % 3, cx = 150 + column * 300, cy = upper ? 100 : 600;
    const category = `category-${i}`, stroke = recipeTones[tone].stroke;
    nodes.push(diagramNode(category, "process", label, cx - 60, cy - 24, 120, 48, tone, { bold: true, fontSize: 18 }));
    let previous = category;
    causes.forEach((text, j) => {
      const ratio = j === 0 ? 0.38 : 0.72, x = cx + 180 * ratio, y = cy + (350 - cy) * ratio;
      const joint = `joint-${i}-${j}`, cause = `cause-${i}-${j}`;
      nodes.push(diagramNode(joint, "circle", "", x - 10, y - 10, 20, 20, tone),
        diagramNode(cause, "text", text, x - 174, y - 32, 150, 32, tone, { fontSize: 16 }));
      edges.push(diagramEdge(`bone-${joint}`, { node: previous }, { node: joint }, { style: { stroke, width: 2 } }),
        diagramEdge(`branch-${cause}`, { node: cause, port: "bottom" }, { node: joint, port: "left" }, { style: { stroke } }));
      previous = joint;
    });
    edges.push(diagramEdge(`bone-${i}-spine`, { node: previous }, { node: `spine-${column}` }, { style: { stroke, width: 2 } }));
  });
  return diagram(nodes, edges);
}
