import type { FlowchartEdge } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "./build";
import type { RecipeTone } from "../recipes/types";

/** @returns An editable three-level organization tree with original role labels. */
export function organizationDiagram() {
  const nodes = [diagramNode("root", "process", "产品研发中心", 440, 0, 220, 76, "blue", { bold: true, fontSize: 20 })];
  const edges: FlowchartEdge[] = [];
  const departments: readonly (readonly [string, string, RecipeTone, readonly string[]])[] = [
    ["product", "产品与设计", "purple", ["产品经理\n需求与规划", "体验设计\n交互与视觉"]],
    ["engineering", "技术研发", "blue", ["前端开发\n产品体验", "后端开发\n服务与数据"]],
    ["delivery", "质量与交付", "green", ["质量保障\n测试与验证", "交付运维\n发布与支持"]],
  ];
  // Levels are explicit world-space rows. Reporting edges carry real port
  // references, so moving a role preserves attachments without implying auto-layout.
  departments.forEach(([id, label, tone, members], i) => {
    const x = i * 380;
    nodes.push(diagramNode(id, "process", label, x + 80, 170, 180, 70, tone, { bold: true, fontSize: 18 }));
    edges.push(diagramEdge(`root-${id}`, { node: "root", port: "bottom" }, { node: id, port: "top" }, { routing: "orthogonal", connector: "rounded" }));
    members.forEach((text, j) => {
      const child = `${id}-${j}`;
      nodes.push(diagramNode(child, "rectangle", text, x + j * 190, 340, 150, 86, tone));
      edges.push(diagramEdge(`reports-${child}`, { node: id, port: "bottom" }, { node: child, port: "top" }, { routing: "orthogonal", connector: "rounded" }));
    });
  });
  return diagram(nodes, edges);
}
