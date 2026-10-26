import type { SimpleTree } from "../../vendor/types";
import type { MindMapOutlineEntry } from "./types";

/**
 * Reads the retained tree only when an outline consumer requests a new accepted version.
 * @param tree - Validated private history carrier, including hidden descendants.
 * @returns Frozen preorder index with no vendor references or geometry.
 */
export function readSimpleOutline(tree: SimpleTree): readonly MindMapOutlineEntry[] {
  const entries: MindMapOutlineEntry[] = [];
  /** @param node - Retained topic. @param parentId - Canonical parent. @param depth - Local depth.
   * @param hidden - Whether an ancestor is folded. @param free - Independent-tree ownership. */
  function visit(node: SimpleTree, parentId: string | null, depth: number, hidden: boolean, free: boolean): void {
    const { data } = node;
    entries.push(Object.freeze({ id: data.uid, text: data.text, parentId, depth, hidden, free, collapsed: !data.expand }));
    for (const child of node.children) {
      const independent = !!child.data._quirekitFree;
      visit(child, independent ? null : data.uid, independent ? 0 : depth + 1,
        independent ? false : hidden || !data.expand, free || independent);
    }
  }
  visit(tree, null, 0, false, false);
  return Object.freeze(entries);
}
