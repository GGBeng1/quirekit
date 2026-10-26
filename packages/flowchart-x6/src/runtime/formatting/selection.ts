import type { FlowchartEdge, FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartAppearance, FlowchartSelectionStyle } from "../../types";

/** @param values - Effective property values. @returns Common value or a mixed/empty sentinel. */
function common<T>(values: readonly T[]): T | null {
  return values.length && values.every(value => value === values[0]) ? values[0]! : null;
}
/** @param next - New selected sources. @param previous - Last source references. @returns Whether ordering and source identity remain unchanged. */
function sameSources<T>(next: readonly T[], previous: readonly T[]): boolean {
  return next.length === previous.length && next.every((source, index) => source === previous[index]);
}
/** @returns A per-editor selection projection; its cache holds only the most recent selection. */
export function createSelectionStyleReader(): (nodes: readonly FlowchartNode[], edges: readonly FlowchartEdge[], appearance: FlowchartAppearance) => FlowchartSelectionStyle {
  let lastNodes: readonly FlowchartNode[] = [], lastEdges: readonly FlowchartEdge[] = [];
  let lastAppearance: FlowchartAppearance | undefined, result: FlowchartSelectionStyle | undefined;
  /** @param nodes - Selected node sources, without geometry reads. @param edges - Selected edge sources. @param appearance - Current presentation defaults. @returns Stable effective formatting when dependencies have not changed. */
  return (nodes, edges, appearance) => {
    // Input notifications can include viewport and position changes. Only source
    // style dependencies and theme affect this O(S) product, never graph size.
    if (result && lastAppearance === appearance && sameSources(nodes, lastNodes) && sameSources(edges, lastEdges)) return result;
    lastNodes = nodes; lastEdges = edges; lastAppearance = appearance;
    result = Object.freeze({ nodeCount: nodes.length, edgeCount: edges.length,
      fontSize: common(nodes.map(node => node.style.fontSize ?? 14)), bold: common(nodes.map(node => node.style.bold ?? false)),
      textAlign: common(nodes.map(node => node.style.textAlign ?? "center")), verticalAlign: common(nodes.map(node => node.style.verticalAlign ?? "middle")),
      padding: common(nodes.map(node => node.style.padding ?? 0)),
      fill: common(nodes.map(node => (node.style.fill ?? appearance.surface).toLowerCase())),
      color: common(nodes.map(node => (node.style.color ?? appearance.text).toLowerCase())),
      stroke: common([...nodes.map(node => (node.style.stroke ?? appearance.primary).toLowerCase()), ...edges.map(edge => (edge.style.stroke ?? appearance.line).toLowerCase())]),
      width: common(edges.map(edge => edge.style.width ?? 1.5)), dashed: common(edges.map(edge => edge.style.dashed ?? false)),
      routing: common(edges.map(edge => edge.routing)), connector: common(edges.map(edge => edge.connector ?? "rounded")),
      crossing: common(edges.map(edge => edge.crossing ?? "none")),
      sourceArrow: common(edges.map(edge => edge.style.sourceArrow ?? "none")), targetArrow: common(edges.map(edge => edge.style.targetArrow ?? "block")) });
    return result;
  };
}
