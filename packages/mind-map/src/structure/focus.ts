import type { MindMapDocument, MindMapNode } from "../model/types";
import { readMindMapDocument } from "../model/document";

/**
 * Retains the whole forest while making one branch easier to work on.
 * @param document - Immutable complete source.
 * @param id - Stable selected topic, including a currently hidden descendant.
 * @returns One undoable folding update, or the original identity for a no-op.
 */
export function focusMindMapBranch(document: MindMapDocument, id: string): MindMapDocument {
  const source = readMindMapDocument(document), path: string[] = [];
  /** @param node - Current tree. @returns Whether it contains the target, retaining its ancestry in path. */
  function find(node: MindMapNode): boolean {
    path.push(node.id);
    if (node.id === id || node.children.some(find)) return true;
    path.pop(); return false;
  }
  if (![source.root, ...(source.floatingTopics ?? []).map(topic => topic.root)].some(find)) throw new TypeError("focus: target topic no longer exists");
  const ancestors = new Set(path); let changed = false;
  /** @param node - Complete source node. @param inside - Whether it is inside the selected branch.
   * @returns Same-identity topic with only its folding state modified. */
  function visit(node: MindMapNode, inside = false): MindMapNode {
    const branch = inside || node.id === id;
    const collapsed = ancestors.has(node.id) ? false : !branch && node.children.length > 0 ? true : node.collapsed;
    changed ||= collapsed !== node.collapsed;
    return { ...node, collapsed, children: node.children.map(child => visit(child, branch)) };
  }
  const root = visit(source.root), floatingTopics = source.floatingTopics?.map(topic => ({ ...topic, root: visit(topic.root) }));
  return changed ? readMindMapDocument({ ...source, root, ...(floatingTopics ? { floatingTopics } : {}) }) : document;
}
