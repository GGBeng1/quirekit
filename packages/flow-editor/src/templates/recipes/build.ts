import { createFlowchart, createFlowchartNode, readFlowchart, type FlowchartDocument } from "@quirekit/flowchart";
import type { RecipeLink, RecipeNode } from "./types";
import { recipeTones } from "./palette";
/** @param nodes - Authored positions and semantic symbols. @param links - Connected source references. @returns Validated graph, without vendor objects or automatic layout assumptions. */
export function buildRecipe(nodes: readonly RecipeNode[], links: readonly RecipeLink[]): FlowchartDocument {
  return readFlowchart({ ...createFlowchart(), nodes: nodes.map(([id, shape, x, y, text, tone = "blue", width, height]) => {
    const node = createFlowchartNode(id, shape, { x, y }, text);
    return { ...node, width: width ?? node.width, height: height ?? node.height, style: shape === "text" ? { fontSize: 20, bold: true } : recipeTones[tone] };
  }), edges: links.map(([from, to, label = "", sourcePort = "bottom", targetPort = "top", vertices = []], i) => ({
    id: `edge-${i}`, source: { node: from, port: sourcePort }, target: { node: to, port: targetPort }, vertices,
    routing: "orthogonal", connector: "rounded", label, labelPosition: 0.5, style: { stroke: "#7b8b9e", targetArrow: "open" },
  })) });
}
