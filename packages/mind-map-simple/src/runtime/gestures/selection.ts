import type { SimpleInstance, SimpleNode } from "../../vendor/types";
import type { MindMapHit } from "./types";

/** @param instance - Current renderer. @returns One bounded snapshot of visible node geometry. */
export function mindMapHits(instance: SimpleInstance): MindMapHit[] {
  return Object.values(instance.renderer.nodeCache).map(node => ({ node, id: String(node.getData("uid")),
    x: node.left, y: node.top, width: node.width, height: node.height }));
}

/** @param node - Candidate. @param roots - Dragged roots. @returns Whether the candidate belongs to a moved tree. */
export function belongsToMindMapSelection(node: SimpleNode, roots: ReadonlySet<SimpleNode>): boolean {
  for (let current: SimpleNode | null = node; current; current = current.parent) if (roots.has(current)) return true;
  return false;
}
