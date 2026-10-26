import { diagram, diagramNode, polar } from "./build";
import type { RecipeTone } from "../recipes/types";

/** @returns Seven independent hexagons arranged as an editable capability map. */
export function honeycombDiagram() {
  const center = { x: 320, y: 340 }, nodes = [diagramNode("hub", "hexagon", "产品能力\n全景", 220, 253, 200, 174, "blue", { fontSize: 24, bold: true })];
  const cells: readonly (readonly [string, RecipeTone])[] = [
    ["战略规划\n目标 · 路线", "purple"], ["用户体验\n研究 · 设计", "blue"], ["技术平台\n架构 · 工程", "green"],
    ["数据洞察\n指标 · 分析", "orange"], ["运营增长\n内容 · 触达", "purple"], ["服务交付\n质量 · 支持", "green"],
  ];
  cells.forEach(([text, tone], i) => {
    const point = polar(center, 190, -90 + i * 60);
    nodes.push(diagramNode(`capability-${i}`, "hexagon", text, point.x - 100, point.y - 87, 200, 174, tone, { fontSize: 18 }));
  });
  return diagram(nodes);
}
