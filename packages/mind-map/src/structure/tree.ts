import type { MindMapNode } from "../model/types";
import type { MindMapStructureLocation, MutableMindMapNode } from "./types";

/** @param node - Validated immutable source. @returns A detached editable tree, retaining all admitted fields. */
export function copyStructureTree(node: MindMapNode): MutableMindMapNode {
  return { ...node, children: node.children.map(copyStructureTree) };
}

/** @param node - Candidate tree. @param id - Stable identity. @param parent - Tree owner.
 * @param grandparent - Parent's owner. @returns Structural location, including collapsed descendants. */
export function locateStructureTopic(node: MutableMindMapNode, id: string, parent?: MutableMindMapNode,
  grandparent?: MutableMindMapNode): MindMapStructureLocation | undefined {
  if (node.id === id) return { node, ...(parent ? { parent } : {}), ...(grandparent ? { grandparent } : {}) };
  for (const child of node.children) {
    const found = locateStructureTopic(child, id, node, parent);
    if (found) return found;
  }
  return undefined;
}

/** @param root - Main tree. @param selected - Explicit subtree roots. @param collapsed - Desired visibility.
 * @param mainId - Main root that must remain expanded. @param inherited - Whether an ancestor already owns the operation.
 * @returns Whether any persistent visibility changed. */
export function collapseStructureTree(root: MutableMindMapNode, selected: ReadonlySet<string>, collapsed: boolean,
  mainId: string, inherited = false): boolean {
  const active = inherited || selected.has(root.id);
  let changed = false;
  if (active && root.id !== mainId && root.children.length && root.collapsed !== collapsed) {
    root.collapsed = collapsed; changed = true;
  }
  for (const child of root.children) changed = collapseStructureTree(child, selected, collapsed, mainId, active) || changed;
  return changed;
}
