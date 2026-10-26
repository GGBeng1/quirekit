import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { isFlowchartContainer } from "./hierarchy";

/** @param document - Valid graph after adding or extending participants. @param changedIds - Participants or bars changed by this command. @returns Only their owners expanded right/down, without moving existing content or changing unrelated containers. */
export function fitSequenceContainers(document: FlowchartDocument, changedIds: ReadonlySet<string>): FlowchartDocument {
  const children = new Map<string, FlowchartNode[]>(), fitted = new Map<string, FlowchartNode>();
  const byId = new Map(document.nodes.map(node => [node.id, node])), owners = new Set<string>();
  for (const id of changedIds) {
    let parent = byId.get(id)?.parent;
    while (parent && !owners.has(parent)) { owners.add(parent); parent = byId.get(parent)?.parent; }
  }
  for (const node of document.nodes) if (node.parent) {
    const siblings = children.get(node.parent) ?? []; siblings.push(node); children.set(node.parent, siblings);
  }
  /** @param node - Acyclic, depth-bounded owner. @returns Memoized bottom-up container geometry. */
  function fit(node: FlowchartNode): FlowchartNode {
    const cached = fitted.get(node.id); if (cached) return cached;
    const members = (children.get(node.id) ?? []).map(fit);
    const result = owners.has(node.id) && isFlowchartContainer(node.shape) && members.length ? { ...node,
      width: Math.max(node.width, ...members.map(child => child.x + child.width - node.x + 32)),
      height: Math.max(node.height, ...members.map(child => child.y + child.height - node.y + 32)),
    } : node;
    fitted.set(node.id, result); return result;
  }
  return { ...document, nodes: document.nodes.map(fit) };
}
