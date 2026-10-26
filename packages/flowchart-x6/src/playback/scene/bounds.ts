import type { FlowchartDocument, FlowchartPoint } from "@quirekit/flowchart";
import type { SceneBounds } from "./types";

/** @param scenes - Accepted presentation diagrams. @returns Their common world extent, including rotated shapes and connector bends. */
export function playbackSceneBounds(scenes: readonly FlowchartDocument[]): SceneBounds {
  const points: FlowchartPoint[] = [];
  for (const scene of scenes) {
    for (const node of scene.nodes) {
      const angle = (node.rotation ?? 0) * Math.PI / 180, c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
      const width = node.width * c + node.height * s, height = node.width * s + node.height * c;
      const x = node.x + (node.width - width) / 2, y = node.y + (node.height - height) / 2;
      points.push({ x, y }, { x: x + width, y: y + height });
    }
    for (const edge of scene.edges) {
      points.push(...edge.vertices);
      for (const terminal of [edge.source, edge.target]) if (!("node" in terminal)) points.push(terminal);
    }
  }
  if (!points.length) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.min(...points.map(point => point.x)), y = Math.min(...points.map(point => point.y));
  return { x, y, width: Math.max(1, Math.max(...points.map(point => point.x)) - x), height: Math.max(1, Math.max(...points.map(point => point.y)) - y) };
}
