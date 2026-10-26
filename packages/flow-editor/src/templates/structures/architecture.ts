import type { FlowchartEdge, FlowchartNode, FlowchartShape } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "../diagrams/build";
import type { RecipeTone } from "../recipes/types";

/** @returns A layered system architecture with true containers and service dependencies. */
export function systemArchitectureTemplate() {
  const nodes: FlowchartNode[] = [{ ...diagramNode("system", "container", "系统架构设计", 0, 0, 1160, 810), style: { bold: true, fontSize: 22, stroke: "#94a3b8" } }];
  const layers: readonly (readonly [string, RecipeTone, readonly string[]])[] = [
    ["访问入口", "blue", ["用户客户端", "管理控制台", "开放 API"]],
    ["应用服务", "purple", ["身份认证", "核心业务服务", "消息与任务"]],
    ["数据存储", "green", ["关系数据库", "缓存与索引", "对象存储"]],
    ["基础设施", "orange", ["监控与日志", "配置与服务发现", "安全与审计"]],
  ];
  const symbols: readonly (readonly FlowchartShape[])[] = [["browser", "browser", "component"], ["component", "server", "queue"],
    ["database", "database", "package"], ["server", "component", "server"]];
  const edges: FlowchartEdge[] = [];
  layers.forEach(([label, tone, services], row) => {
    const y = 85 + row * 180, layer = `layer-${row}`;
    nodes.push({ ...diagramNode(layer, "lane-horizontal", label, 30, y, 1100, 145, tone, { bold: true, fontSize: 18 }), parent: "system" });
    services.forEach((text, column) => {
      const id = `service-${row}-${column}`;
      nodes.push({ ...diagramNode(id, symbols[row]![column]!, text, 215 + column * 295, y + 37, 210, 76, tone), parent: layer });
      if (row) edges.push(diagramEdge(`dependency-${row}-${column}`, { node: `service-${row - 1}-${column}`, port: "bottom" }, { node: id, port: "top" },
        { routing: "orthogonal", connector: "rounded", style: { targetArrow: "open" } }));
    });
  });
  return diagram(nodes, edges);
}
