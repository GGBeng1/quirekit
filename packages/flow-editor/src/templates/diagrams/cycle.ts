import type { FlowchartEdge, FlowchartPort } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode, polar } from "./build";
import { recipeTones } from "../recipes/palette";
import type { RecipeTone } from "../recipes/types";

/** @returns A six-stage circular process with persistent curved connectors. */
export function cycleDiagram() {
  const center = { x: 370, y: 350 }, nodes = [
    diagramNode("title", "text", "持续迭代", 260, 314, 220, 52, "slate", { fontSize: 28, bold: true }),
    diagramNode("subtitle", "text", "验证 · 反馈 · 改进", 245, 370, 250, 34, "slate", { fontSize: 16 }),
  ];
  const edges: FlowchartEdge[] = [], labels = ["发现需求", "定义问题", "设计方案", "实施交付", "验证效果", "复盘改进"];
  const tones: readonly RecipeTone[] = ["blue", "purple", "green", "orange", "blue", "green"];
  const ports: readonly (readonly [FlowchartPort, FlowchartPort])[] = [
    ["right", "top"], ["bottom", "top"], ["bottom", "right"], ["left", "bottom"], ["top", "bottom"], ["top", "left"],
  ];
  // Mid-arc vertices are saved world points consumed by the existing smooth
  // connector; they keep the initial ring open around its central captions.
  labels.forEach((label, i) => {
    const angle = -90 + i * 60, point = polar(center, 240, angle), tone = tones[i]!;
    nodes.push(diagramNode(`stage-${i}`, "circle", `0${i + 1}\n${label}`, point.x - 60, point.y - 60, 120, 120, tone, { fontSize: 18, bold: true }));
    // Explicit contour ports keep arrow tips outside the filled circles;
    // automatic center anchoring can bury a curved edge's marker under a node.
    edges.push(diagramEdge(`cycle-${i}`, { node: `stage-${i}`, port: ports[i]![0] }, { node: `stage-${(i + 1) % 6}`, port: ports[i]![1] }, {
      connector: "smooth", vertices: [polar(center, 240, angle + 30)], style: { stroke: recipeTones[tone].stroke, width: 2, targetArrow: "block" },
    }));
  });
  return diagram(nodes, edges);
}
