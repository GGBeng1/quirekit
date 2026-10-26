import type { Edge, EdgeView } from "@antv/x6";
import type { FlowRuntime } from "../types";

/** @param runtime - Graph lifetime. @returns Explicit synchronous refresh for source-bound exports. */
export function bindCrossings(runtime: FlowRuntime): () => void {
  const { graph } = runtime, active = new Set<Edge>();
  let pending = false, refreshing = false;
  /** Refreshes only opted-in connectors after native routing has settled. */
  function refresh(): void {
    if (runtime.destroyed || refreshing) return;
    pending = false; refreshing = true;
    try { for (const edge of active) (graph.findViewByCell(edge) as EdgeView | null)?.update(); }
    finally { refreshing = false; }
  }
  /** Schedules one command-boundary projection; gestures publish their final routes on mouseup. */
  function schedule(): void {
    if (pending || !active.size || runtime.destroyed) return;
    pending = true;
    queueMicrotask(() => { if (!runtime.destroyed && !runtime.dragging && !graph.model.hasActiveBatch()) refresh(); else pending = false; });
  }
  /** @param edge - Changed connection. Keeps a bounded set without scanning unrelated nodes. */
  function track(edge: Edge): void {
    const crossing = edge.getData()?.source?.crossing;
    if (crossing && crossing !== "none") active.add(edge); else active.delete(edge);
  }
  graph.on("cell:added", ({ cell }) => { if (cell.isEdge()) track(cell); schedule(); });
  graph.on("cell:removed", ({ cell }) => { if (cell.isEdge()) active.delete(cell); schedule(); });
  graph.on("cell:change:*", ({ cell, key, options }) => {
    if (options.qkDerived || !["position", "size", "source", "target", "vertices", "data", "zIndex"].includes(String(key))) return;
    if (cell.isEdge() && key === "data") track(cell);
    if (!runtime.dragging && !graph.model.hasActiveBatch()) schedule();
  });
  graph.on("batch:stop", schedule); graph.on("cell:mouseup", schedule);
  return refresh;
}
