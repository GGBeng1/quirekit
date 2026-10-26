import type { Edge, EdgeView } from "@antv/x6";
import { readEdge } from "../../../codec/read";
import type { FlowRuntime } from "../../types";
import { updateSelectedEdges } from "../format";
import { chooseLabelPlacement, createLabelObstacles } from "./placement";
import type { LabelPlacement } from "./types";
import type { FlowchartPoint } from "@quirekit/flowchart";

/** @param runtime - Writable direct edge selection. Arranges labels on current paths in one native history batch. */
export function arrangeSelectedLabels(runtime: FlowRuntime): void {
  runtime.refreshCrossings();
  const selected = new Set(runtime.graph.getSelectedCells().filter(c => c.isEdge()).map(c => c.id));
  const canvas = runtime.mount.ownerDocument.createElement("canvas"), context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持文字测量");
  context.font = `13px ${runtime.appearance.fontFamily}`;
  const measured = new Map<string, { width: number; height: number }>();
  /** @param edge - Label owner. @param distance - Native path fraction. @param offset - Normal or world offset. @returns Conservative world bounds and canonical placement. */
  function candidate(edge: Edge, distance: number, offset: number | FlowchartPoint): LabelPlacement | null {
    const view = runtime.graph.findViewByCell(edge) as EdgeView | null, point = view?.getPointAtRatio(distance);
    if (!view || !point) return null;
    const tangent = view.getTangentAtRatio(distance), dx = tangent?.end.x - tangent?.start.x, dy = tangent?.end.y - tangent?.start.y, length = Math.hypot(dx, dy);
    const delta = typeof offset === "object" ? offset : { x: length ? -dy / length * offset : 0, y: length ? dx / length * offset : offset };
    let size = measured.get(edge.id);
    if (!size) {
      const lines = readEdge(edge).label.split("\n");
      size = { width: Math.max(...lines.map(line => context!.measureText(line).width)) + 8, height: lines.length * 16 + 8 }; measured.set(edge.id, size);
    }
    const { width, height } = size;
    return { distance, offset, box: { x: point.x + delta.x - width / 2, y: point.y + delta.y - height / 2, width, height } };
  }
  // Freeze fixed occupancy first. Selected labels are inserted as they settle,
  // so the command neither collides with itself nor discards locked neighbours.
  const obstacles = createLabelObstacles(runtime.graph.getNodes().filter(node => !["container", "lane-horizontal", "lane-vertical", "group", "lifeline"].includes(node.getData()?.source?.shape)).map(node => node.getBBox().bbox(node.getAngle()).inflate(4)));
  const edges = runtime.graph.getEdges();
  for (const edge of edges) if (!selected.has(edge.id) && readEdge(edge).label) {
    const source = readEdge(edge), placement = candidate(edge, source.labelPosition, source.labelOffset ?? 12);
    if (placement) obstacles.add(placement.box);
  }
  const updates = new Map<string, LabelPlacement>();
  for (const edge of edges.filter(edge => selected.has(edge.id))) {
    const source = readEdge(edge); if (!source.label) continue;
    const current = candidate(edge, source.labelPosition, source.labelOffset ?? 12); if (!current) continue;
    const choices = [current];
    for (const distance of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const offset of [-16, 16, -28, 28, -40, 40]) {
      const choice = candidate(edge, distance, offset); if (choice) choices.push(choice);
    }
    const best = chooseLabelPlacement(choices, obstacles); obstacles.add(best.box); updates.set(edge.id, best);
  }
  updateSelectedEdges(runtime, edge => {
    const best = updates.get(edge.id);
    return best ? { ...edge, labelPosition: best.distance, labelOffset: best.offset } : edge;
  });
}
