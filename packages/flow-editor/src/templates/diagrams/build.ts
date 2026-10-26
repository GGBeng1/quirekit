import { createFlowchart, readFlowchart, type FlowchartDocument, type FlowchartEdge, type FlowchartNode, type FlowchartNodeStyle, type FlowchartPoint, type FlowchartShape, type FlowchartTerminal } from "@quirekit/flowchart";
import { recipeTones } from "../recipes/palette";
import type { RecipeTone } from "../recipes/types";
import type { DiagramConnection } from "./types";

/** @param id - Local identity. @param shape - Admitted symbol. @param text - Literal content. @param x - World left. @param y - World top. @param width - World width. @param height - World height. @param tone - Pastel family. @param style - Explicit text/stroke overrides. @returns Portable editable node. */
export function diagramNode(id: string, shape: FlowchartShape, text: string, x: number, y: number, width: number, height: number, tone: RecipeTone = "blue", style: FlowchartNodeStyle = {}): FlowchartNode {
  return { id, shape, text, x, y, width, height, style: { ...(shape === "text" ? {} : recipeTones[tone]), fontSize: 16, ...style } };
}
/** @param id - Local identity. @param source - True starting attachment. @param target - True ending attachment. @param options - Saved line treatment. @returns A markerless straight line unless explicitly overridden. */
export function diagramEdge(id: string, source: FlowchartTerminal, target: FlowchartTerminal, options: DiagramConnection = {}): FlowchartEdge {
  return { id, source, target, vertices: [], routing: "straight", connector: "sharp", label: "", labelPosition: 0.5,
    ...options, style: { stroke: "#94a3b8", width: 1.5, sourceArrow: "none", targetArrow: "none", ...options.style } };
}
/** @param nodes - Authored world-space symbols. @param edges - Authored attachment graph. @returns Strictly validated, vendor-independent template. */
export function diagram(nodes: readonly FlowchartNode[], edges: readonly FlowchartEdge[] = []): FlowchartDocument {
  return readFlowchart({ ...createFlowchart(), nodes, edges });
}
/** @param center - Circle center in world space. @param radius - World-space radius. @param degrees - Clockwise angle from the positive horizontal axis. @returns World-space point rounded to subpixel precision. */
export function polar(center: FlowchartPoint, radius: number, degrees: number): FlowchartPoint {
  const angle = degrees * Math.PI / 180;
  return { x: Math.round((center.x + Math.cos(angle) * radius) * 100) / 100, y: Math.round((center.y + Math.sin(angle) * radius) * 100) / 100 };
}
