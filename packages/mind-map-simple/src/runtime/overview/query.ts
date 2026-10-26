import type { SimpleInstance, SimpleNode } from "../../vendor/types";
import type { MindMapBounds, MindMapOverview } from "./types";

/** @param roots - Selected visible trees. @returns Union of visible descendants, excluding independent trees on a main-root carrier. */
export function mindMapSelectionBounds(roots: readonly SimpleNode[]): MindMapBounds | null {
  const seen = new Set<SimpleNode>(); let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  /** @param node - Current visible subtree. */
  function visit(node: SimpleNode): void {
    if (seen.has(node)) return; seen.add(node);
    if (node.group?.node.isConnected && node.width > 0 && node.height > 0) {
      left = Math.min(left, node.left); top = Math.min(top, node.top);
      right = Math.max(right, node.left + node.width); bottom = Math.max(bottom, node.top + node.height);
    }
    for (const child of node.children) if (child.parent === node) visit(child);
  }
  roots.forEach(visit);
  return Number.isFinite(left) ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}

/** @param instance - Settled geometry authority. @param version - Render generation. @returns Detached visible silhouettes without source/history reads. */
export function readMindMapOverview(instance: SimpleInstance, version: number): MindMapOverview {
  const topics = Object.values(instance.renderer.nodeCache).filter(node => node.group?.node.isConnected && node.width > 0 && node.height > 0)
    .map(node => Object.freeze({ id: String(node.getData("uid")), root: node.isRoot, x: node.left, y: node.top, width: node.width, height: node.height }));
  return Object.freeze({ version, bounds: Object.freeze(instance.draw.bbox()), topics: Object.freeze(topics),
    viewportWidth: instance.width, viewportHeight: instance.height });
}
