import { flowchartNodeBounds } from "../transform/geometry";
import type { FlowchartDocument, FlowchartNode, FlowchartPoint } from "../model/types";
import { isFlowchartContainer } from "../structure/hierarchy";

/** @param document - Valid graph. @param ids - Selected identities. @returns Outermost selected nodes, in document order. */
export function selectedRoots(document: FlowchartDocument, ids: readonly string[]): FlowchartNode[] {
  const selected = new Set(ids), nodes = new Map(document.nodes.map(node => [node.id, node]));
  return document.nodes.filter(node => {
    if (!selected.has(node.id)) return false;
    let parent = node.parent;
    while (parent) { if (selected.has(parent)) return false; parent = nodes.get(parent)?.parent; }
    return true;
  });
}
/** @param document - Unchanged source. @param updates - Root positions and dimensions. @returns Transformed roots, descendants and wholly translated internal bends. */
export function transformRoots(document: FlowchartDocument, updates: ReadonlyMap<string, FlowchartNode>): FlowchartDocument {
  const byId = new Map(document.nodes.map(node => [node.id, node])), movement = new Map<string, FlowchartPoint>();
  // Resolve descendants against their outer selected root in world space;
  // vendor parent movement must not also translate these source coordinates.
  const nodes = document.nodes.map(node => {
    let root: FlowchartNode | undefined = node;
    while (root && !updates.has(root.id)) root = root.parent ? byId.get(root.parent) : undefined;
    if (!root) return node;
    const next = updates.get(root.id)!, delta = { x: next.x - root.x, y: next.y - root.y };
    movement.set(node.id, delta);
    return root.id === node.id ? next : { ...node, x: node.x + delta.x, y: node.y + delta.y };
  });
  const edges = document.edges.map(edge => {
    const a = "node" in edge.source ? movement.get(edge.source.node) : undefined;
    const b = "node" in edge.target ? movement.get(edge.target.node) : undefined;
    return a && b && a.x === b.x && a.y === b.y ? { ...edge, vertices: edge.vertices.map(p => ({ x: p.x + a.x, y: p.y + a.y })) } : edge;
  });
  return fitOwners({ ...document, nodes, edges }, new Set(updates.keys()));
}
/** @param document - World-space result. @param changed - Modified roots. @returns Owners expanded around content without translating existing children. */
export function fitOwners(document: FlowchartDocument, changed: ReadonlySet<string>): FlowchartDocument {
  const nodes = new Map(document.nodes.map(node => [node.id,node])), owners = new Set<string>();
  for (const id of changed) { let parent = nodes.get(id)?.parent; while (parent) { owners.add(parent); parent = nodes.get(parent)?.parent; } }
  const children = new Map<string, FlowchartNode[]>();
  for (const node of document.nodes) if (node.parent) { const list = children.get(node.parent) ?? []; list.push(node); children.set(node.parent,list); }
  const done = new Map<string,FlowchartNode>();
  /** @param node - Depth-bounded owner. @returns Bottom-up expansion preserving every child's world rectangle. */
  function fit(node: FlowchartNode): FlowchartNode {
    if (done.has(node.id)) return done.get(node.id)!;
    const members = (children.get(node.id) ?? []).map(fit);
    if (!owners.has(node.id) || !members.length || !isFlowchartContainer(node.shape)) { done.set(node.id,node); return node; }
    const bounds = members.map(flowchartNodeBounds);
    const x = Math.min(node.x,...bounds.map(n => n.x - 24)), y = Math.min(node.y,...bounds.map(n => n.y - 48));
    const next = { ...node, x,y, width: Math.max(node.x + node.width,...bounds.map(n => n.x + n.width + 24)) - x,
      height: Math.max(node.y + node.height,...bounds.map(n => n.y + n.height + 24)) - y };
    done.set(node.id,next); return next;
  }
  return { ...document, nodes: document.nodes.map(fit) };
}
