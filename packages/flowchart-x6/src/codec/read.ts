import type { Edge, Graph, Node, TerminalData } from "@antv/x6";
import { readFlowchart, type FlowchartDocument, type FlowchartEdge, type FlowchartNode, type FlowchartPort, type FlowchartTerminal } from "@quirekit/flowchart";
import { readGraphPage } from "./metadata";

/** @param value - Current runtime attachment. @returns Portable attachment, validated with the whole graph. */
function terminal(value: TerminalData): FlowchartTerminal {
  if ("cell" in value && value.cell) {
    const anchor = value.anchor;
    return { node: String(value.cell), ...(value.port ? { port: value.port as FlowchartPort }
      : anchor && typeof anchor !== "string" && anchor.name === "quirekit-relative" ? { anchor: { x: Number(anchor.args?.x), y: Number(anchor.args?.y) } } : {}) };
  }
  if ("x" in value && "y" in value) return { x: Number(value.x), y: Number(value.y) };
  throw new TypeError("连线端点尚未完成");
}
/** @param node - Runtime node. @returns Portable content with authoritative interactive geometry. */
export function readNode(node: Node): FlowchartNode {
  const source = node.getData<{ source: FlowchartNode }>().source;
  const { parent: _parent, rotation: _rotation, ...content } = source, parent = node.getParentId();
  const rotation = ((node.getAngle() % 360) + 360) % 360;
  return { ...content, id: node.id, ...node.getPosition(), ...node.getSize(), ...(rotation || source.rotation !== undefined ? { rotation } : {}), ...(parent ? { parent } : {}) };
}
/** @param edge - Runtime connector. @returns Portable connection including manually edited bends/labels. */
export function readEdge(edge: Edge): FlowchartEdge {
  const source = edge.getData<{ source: FlowchartEdge }>().source;
  const position = edge.getLabels()[0]?.position;
  const rawOffset = typeof position === "object" ? position.offset ?? source.labelOffset ?? 12 : source.labelOffset ?? 12;
  const offset = typeof rawOffset === "number" ? rawOffset : { x: rawOffset.x ?? 0, y: rawOffset.y ?? 0 };
  return { ...source, ...(offset !== 12 || source.labelOffset !== undefined ? { labelOffset: offset } : {}), id: edge.id, source: terminal(edge.getSource()), target: terminal(edge.getTarget()), vertices: edge.getVertices(),
    labelPosition: typeof position === "number" ? position : position?.distance ?? source.labelPosition };
}
/** @param graph - Isolated runtime. @param revision - Host base revision. @returns Fully validated detached source without viewport state. */
export function readGraph(graph: Graph, revision: number): FlowchartDocument {
  const page = readGraphPage(graph);
  return readFlowchart({ format: "quirekit-flowchart", version: 1, revision, ...(page ? { page } : {}),
    nodes: graph.getNodes().sort((a, b) => Number(a.getProp("qkOrder") ?? a.getZIndex() ?? 0) - Number(b.getProp("qkOrder") ?? b.getZIndex() ?? 0)).map(readNode),
    edges: graph.getEdges().sort((a, b) => (a.getZIndex() ?? 0) - (b.getZIndex() ?? 0)).map(readEdge) });
}
