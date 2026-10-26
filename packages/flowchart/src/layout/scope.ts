import { selectedRoots } from "../arrange/selection";
import { isFlowchartContainer, isSequenceParticipant, isSequenceFragment } from "../structure/hierarchy";
import { assertFlowchartUnlocked } from "../objects/selection";
import type { FlowchartDocument } from "../model/types";
import type { LayoutScope } from "./types";

/** @param document - Validated source. @param ids - Explicit selection, or empty for top-level layout. @returns Scope with fixed dependencies and collapsed containment. */
export function layoutScope(document: FlowchartDocument, ids: readonly string[]): LayoutScope {
  const byId = new Map(document.nodes.map(n => [n.id,n]));
  let roots = selectedRoots(document,ids);
  const selectedOwner = roots.length === 1 && isFlowchartContainer(roots[0]!.shape) ? roots[0] : undefined;
  if (selectedOwner) { assertFlowchartUnlocked(document,[selectedOwner.id]); roots = document.nodes.filter(n => n.parent === selectedOwner.id); }
  else if (!ids.length) roots = document.nodes.filter(n => !n.parent);
  if (!roots.length) throw new Error("请选择需要整理的图形或容器");
  if (roots.length > 1000) throw new RangeError("单次自动布局最多支持 1000 个图形，请分组选取");
  if (roots.some(n => n.parent !== roots[0]!.parent)) throw new Error("请选择同一容器内的图形");
  const owner = roots[0]!.parent ? byId.get(roots[0]!.parent) : undefined;
  if (owner) assertFlowchartUnlocked(document,[owner.id]);
  if (roots.some(n => isSequenceParticipant(n.shape) || isSequenceFragment(n.shape) || n.shape.startsWith("lane-") || n.shape.startsWith("phase-") || ["activation","destruction"].includes(n.shape))) throw new Error("请使用专用结构工具整理时序、泳道和阶段元素");
  const candidates = new Set(roots.map(n => n.id)), membership = new Map<string,string>(), pinned = new Set<string>();
  // Collapse containment before reading edges. Connections to children therefore
  // rank their atomic owners, without flattening or moving a descendant twice.
  for (const node of document.nodes) {
    let root: typeof node | undefined = node;
    while (root && !candidates.has(root.id)) root = root.parent ? byId.get(root.parent) : undefined;
    if (root) { membership.set(node.id,root.id); if (node.locked) pinned.add(root.id); }
  }
  for (const edge of document.edges) if (edge.locked) for (const end of [edge.source,edge.target]) {
    const root = "node" in end ? membership.get(end.node) : undefined; if (root) pinned.add(root);
  }
  return { roots, ...(owner ? { owner } : {}), pinned, membership, obstacles: document.nodes.filter(n => n.parent === roots[0]!.parent && !candidates.has(n.id)) };
}
