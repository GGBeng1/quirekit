import type { MindMapDocument } from "../model/types";
import { readMindMapDocument } from "../model/document";
import { copyStructureTree } from "./tree";
import type { MindMapStructureResult, MutableMindMapNode } from "./types";

/**
 * Opens only the ancestors necessary to display an existing topic.
 * @param document - Complete canonical forest.
 * @param id - Stable target identity, including folded descendants.
 * @returns One atomic source change, or the original source when already visible or absent.
 */
export function revealMindMapTopic(document: MindMapDocument, id: string): MindMapStructureResult {
  const source = readMindMapDocument(document), root = copyStructureTree(source.root);
  const floatingTopics = source.floatingTopics?.map(topic => ({ ...topic, root: copyStructureTree(topic.root) }));
  let changed = false;
  /** @param node - Current subtree. @returns Whether this subtree contains the target. */
  function visit(node: MutableMindMapNode): boolean {
    if (node.id === id) return true;
    for (const child of node.children) {
      if (!visit(child)) continue;
      if (node.collapsed) { node.collapsed = false; changed = true; }
      return true;
    }
    return false;
  }
  const found = [root, ...(floatingTopics ?? []).map(topic => topic.root)].some(visit);
  return { document: changed ? readMindMapDocument({ ...source, root, ...(floatingTopics ? { floatingTopics } : {}) }) : document,
    selectedIds: found ? [id] : [] };
}
