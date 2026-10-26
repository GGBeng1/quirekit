import type {
  EditorUIDragAutoScrollDecision,
  EditorUIDragAutoScrollEdge
} from "../types";
import type { ResolveEditorUIBlockDragAutoScrollDecisionOptions } from "./types";

/**
 * Maps mounted physical scroll deltas into one typed logical edge decision.
 *
 * The mounted adapter continues to own scrollport measurement and edge-pressure
 * calculation. This headless helper only normalizes finite deltas and names the
 * active edges without reading browser or document state.
 *
 * @param options - Signed mounted deltas and writing direction.
 * @returns Idle or signed typed auto-scroll decision.
 */
export function resolveEditorUIBlockDragAutoScrollDecision(
  options: ResolveEditorUIBlockDragAutoScrollDecisionOptions
): EditorUIDragAutoScrollDecision {
  const deltaX = Number.isFinite(options.deltaX) ? options.deltaX : 0;
  const deltaY = Number.isFinite(options.deltaY) ? options.deltaY : 0;
  if (deltaX === 0 && deltaY === 0) return { kind: "idle" };

  return {
    kind: "scroll",
    deltaX,
    deltaY,
    edges: resolveLogicalEdges(deltaX, deltaY, options.writingDirection)
  };
}

/**
 * Names physical scroll deltas in logical writing-direction terms.
 *
 * @param deltaX - Signed horizontal scroll delta.
 * @param deltaY - Signed vertical scroll delta.
 * @param writingDirection - Inline writing direction.
 * @returns Active logical edges in deterministic inline-then-block order.
 */
function resolveLogicalEdges(
  deltaX: number,
  deltaY: number,
  writingDirection: ResolveEditorUIBlockDragAutoScrollDecisionOptions["writingDirection"]
): readonly EditorUIDragAutoScrollEdge[] {
  const edges: EditorUIDragAutoScrollEdge[] = [];
  if (deltaX < 0) {
    edges.push(writingDirection === "rtl" ? "inline-end" : "inline-start");
  } else if (deltaX > 0) {
    edges.push(writingDirection === "rtl" ? "inline-start" : "inline-end");
  }
  if (deltaY < 0) edges.push("block-start");
  else if (deltaY > 0) edges.push("block-end");
  return edges;
}
