import type { QuireAiBlockItem, QuireAiCapability } from "@quirekit/ai-contract";
import type { FlowchartEmbed, FlowchartNode, FlowchartTerminal } from "@quirekit/flowchart";
import { readFlowchartNode } from "../source";

const cache = new WeakMap<FlowchartEmbed, readonly QuireAiBlockItem[]>();

/** The graph source, never the PNG, explains the diagram to the model. */
export const flowchartAiCapabilities: readonly QuireAiCapability[] = [{
  kind: "block", node: "flowchart",
  /** @param node - Flowchart atom. @returns Bounded node and connection summary. */
  label(node) {
    const flow = readFlowchartNode(node);
    return flow ? flowchartAiLabel(flow) : "流程图：源数据无效";
  },
  /** @param node - Flowchart atom. @returns Every node and connection. */
  items(node) {
    const flow = readFlowchartNode(node);
    return flow ? flowchartAiItems(flow) : [];
  }
}];

/**
 * @param flow - Validated flowchart, wherever the document stores it.
 * @returns Summary with the first 40 nodes and connections.
 */
export function flowchartAiLabel(flow: FlowchartEmbed): string {
  const items = flowchartAiItems(flow);
  const elements = items.slice(0, 40).map(item => ({ id: item.id, ...item.properties, ...(item.label ? { label: item.label.slice(0, 160) } : {}) }));
  return `流程图 ${JSON.stringify({ id: flow.id, revision: flow.document.revision, title: flow.title, total: items.length, elements })}`;
}

/**
 * @param flow - Validated flowchart, wherever the document stores it.
 * @returns Nodes with their full text, then connections with their endpoints.
 */
export function flowchartAiItems(flow: FlowchartEmbed): readonly QuireAiBlockItem[] {
  const cached = cache.get(flow);
  if (cached) return cached;
  const nodes = flow.document.nodes.map(node => {
    const label = nodeText(node);
    return { id: node.id, ...(label ? { label } : {}), properties: {
      kind: "node", shape: node.shape, x: node.x, y: node.y, width: node.width, height: node.height, ...(node.parent ? { parent: node.parent } : {})
    } };
  });
  const edges = flow.document.edges.map(edge => ({ id: edge.id, ...(edge.label ? { label: edge.label } : {}),
    properties: { kind: "edge", from: terminal(edge.source), to: terminal(edge.target) } }));
  const items = [...nodes, ...edges];
  cache.set(flow, items);
  return items;
}

/** @param node - Shape. @returns Its text followed by class members or entity fields, one per line. */
function nodeText(node: FlowchartNode): string {
  const members = node.uml ? [...node.uml.attributes, ...node.uml.operations] : [];
  const fields = node.entity?.fields.map(field => [field.name, field.type, field.key === "none" ? "" : field.key].filter(Boolean).join(" ")) ?? [];
  return [node.text, ...members, ...fields].filter(Boolean).join("\n");
}

/** @param value - Connection end. @returns Node id, or the free point. */
function terminal(value: FlowchartTerminal): string {
  return "node" in value ? value.node : `(${Math.round(value.x)},${Math.round(value.y)})`;
}
