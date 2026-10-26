import type { SimpleInstance, SimpleNode } from "../../vendor/types";
import { setMindMapSelection } from "../../vendor/selection";

/** @param instance - Live geometry. @param node - Selected target. */
export function revealMindMapGeometry(instance: SimpleInstance, node: SimpleNode): void {
  const { scale, x, y } = instance.view;
  const margin = Math.max(24, 24 * scale);
  const left = node.left * scale + x, top = node.top * scale + y;
  // Keep the existing zoom and move only the minimum distance needed to expose
  // the chosen node. Oversized nodes align their leading edge to the margin.
  // Expansion/creation controls extend beyond the body and scale with the node.
  const dx = left < margin || node.width * scale > instance.width - margin * 2 ? margin - left
    : Math.min(0, instance.width - margin - left - node.width * scale);
  const dy = top < margin || node.height * scale > instance.height - margin * 2 ? margin - top
    : Math.min(0, instance.height - margin - top - node.height * scale);
  if (dx || dy) instance.view.translateXY(dx, dy);
}

/**
 * Resolves a directional target using retained world geometry and structural neighbors.
 * @param node - Current selection anchor.
 * @param nodes - Visible nodes only.
 * @param key - Directional key.
 * @returns Nearest meaningful target, or the existing anchor at a boundary.
 */
function neighbor(node: SimpleNode, nodes: readonly SimpleNode[], key: string): SimpleNode {
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const sign = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  const cx = node.left + node.width / 2, cy = node.top + node.height / 2;
  let candidates = nodes.filter(other => other !== node && (horizontal
    ? (other.left + other.width / 2 - cx) * sign > 1
    : (other.top + other.height / 2 - cy) * sign > 1));
  const related = candidates.filter(other => horizontal
    ? other === node.parent || other.parent === node
    : other.parent === node.parent && other.dir === node.dir);
  if (related.length) candidates = related;
  let result = node, best = Infinity;
  for (const other of candidates) {
    const dx = Math.abs(other.left + other.width / 2 - cx), dy = Math.abs(other.top + other.height / 2 - cy);
    const primary = horizontal ? dx : dy, cross = horizontal ? dy : dx;
    const score = primary + cross * 3;
    if (score < best) { best = score; result = other; }
  }
  return result;
}

/**
 * Handles selection-only keys with no source serialization, history or layout work.
 * @param instance - Live owned renderer.
 * @param event - Canvas key, already excluded from native text/IME input.
 * @param cancel - Cancels an unfinished pointer gesture before selecting.
 * @returns Whether the key belonged to canvas navigation.
 */
export function navigateMindMap(instance: SimpleInstance, event: KeyboardEvent, cancel: () => void): boolean {
  const all = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "a";
  const move = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Escape"].includes(event.key);
  if (!all && !move) return false;
  event.preventDefault(); cancel();
  if (event.key === "Escape") { setMindMapSelection(instance, []); return true; }
  const nodes = Object.values(instance.renderer.nodeCache);
  if (all) { setMindMapSelection(instance, nodes); return true; }
  const anchor = instance.renderer.activeNodeList[0];
  const next = !anchor || event.key === "Home" ? instance.renderer.root : neighbor(anchor, nodes, event.key);
  setMindMapSelection(instance, [next]); revealMindMapGeometry(instance, next);
  return true;
}
