import type { FlowchartEdge } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode, polar } from "./build";
import { recipeTones } from "../recipes/palette";
import type { RecipeTone } from "../recipes/types";

/** @returns A radial bubble map with two rings of editable relationships. */
export function radialDiagram() {
  const center = { x: 460, y: 440 }, nodes = [diagramNode("hub", "circle", "产品生态\n关系图", 370, 350, 180, 180, "blue", { bold: true, fontSize: 23 })];
  const edges: FlowchartEdge[] = [];
  const groups: readonly (readonly [string, RecipeTone, readonly string[]])[] = [
    ["用户", "blue", ["真实\n需求", "使用\n反馈"]], ["产品", "purple", ["核心\n价值", "体验\n设计"]],
    ["技术", "green", ["平台\n能力", "数据\n支持"]], ["运营", "orange", ["内容\n触达", "服务\n支持"]],
    ["伙伴", "purple", ["渠道\n合作", "生态\n资源"]], ["团队", "green", ["知识\n共享", "目标\n协同"]],
  ];
  groups.forEach(([label, tone, leaves], i) => {
    const angle = -90 + i * 60, point = polar(center, 245, angle), group = `group-${i}`, stroke = recipeTones[tone].stroke;
    nodes.push(diagramNode(group, "circle", label, point.x - 55, point.y - 55, 110, 110, tone, { fontSize: 20, bold: true }));
    edges.push(diagramEdge(`hub-${i}`, { node: "hub" }, { node: group }, { style: { stroke, width: 2 } }));
    leaves.forEach((text, j) => {
      const point = polar(center, 380, angle + (j ? 11 : -11)), id = `satellite-${i}-${j}`;
      nodes.push(diagramNode(id, "circle", text, point.x - 36, point.y - 36, 72, 72, tone, { fontSize: 14 }));
      edges.push(diagramEdge(`branch-${i}-${j}`, { node: group }, { node: id }, { style: { stroke } }));
    });
  });
  return diagram(nodes, edges);
}
