import type { Edge, EdgeView, Rectangle } from "@antv/x6";
import type { FlowRuntime } from "../../types";

/** @param runtime - Isolated instance. @returns Synchronous obstacle projection barrier for export and explicit label layout. */
export function bindRouteRefresh(runtime: FlowRuntime): () => void {
  const { graph } = runtime, active = new Set<Edge>(), dirty = new Map<string, Rectangle>();
  let pending = false, refreshing = false;
  /** Refreshes affected world paths once at a settled gesture/command boundary. */
  function refresh(): void {
    pending = false;
    if (runtime.destroyed || refreshing || !dirty.size) return;
    const regions = [...dirty.values()]; dirty.clear(); refreshing = true;
    try {
      for (const edge of active) {
        const view = graph.findViewByCell(edge) as EdgeView | null, box = view?.path?.bbox();
        if (box && regions.some(region => region.intersectsWithRect(box))) view!.update();
      }
    } finally { refreshing = false; }
  }
  /** Coalesces command completion without hiding work during a moving gesture. */
  function schedule(): void {
    if (pending || !dirty.size || runtime.destroyed) return;
    pending = true;
    queueMicrotask(() => { if (!runtime.dragging && !graph.model.hasActiveBatch()) refresh(); else pending = false; });
  }
  /** @param edge - Added or formatted edge. Tracks only automatic orthogonal projections. */
  function track(edge: Edge): void {
    if (edge.getData()?.source?.routing === "orthogonal") active.add(edge); else active.delete(edge);
  }
  graph.on("cell:added", ({ cell }) => {
    if (cell.isEdge()) track(cell);
    else dirty.set(cell.id, cell.getBBox().bbox(cell.isNode() ? cell.getAngle() : 0).inflate(8));
    schedule();
  });
  graph.on("cell:removed", ({ cell }) => {
    if (cell.isEdge()) active.delete(cell); else dirty.set(cell.id, cell.getBBox().inflate(8));
    schedule();
  });
  graph.on("cell:change:*", ({ cell, key, previous, options }) => {
    if (options.qkDerived || runtime.destroyed || refreshing) return;
    if (cell.isEdge()) { if (key === "data") track(cell); return; }
    if (!cell.isNode() || !["position", "size", "angle"].includes(String(key))) return;
    const current = cell.getBBox().bbox(cell.getAngle()).inflate(8);
    const before = key === "position" && previous ? current.clone().translate(previous.x - cell.getPosition().x, previous.y - cell.getPosition().y)
      : key === "size" && previous ? cell.getBBox().clone().update(cell.getBBox().x, cell.getBBox().y, previous.width, previous.height).bbox(cell.getAngle()).inflate(8)
      : key === "angle" && typeof previous === "number" ? cell.getBBox().bbox(previous).inflate(8) : current;
    dirty.set(cell.id, (dirty.get(cell.id) ?? before).union(current));
    if (!runtime.dragging && !graph.model.hasActiveBatch()) schedule();
  });
  graph.on("batch:stop", schedule); graph.on("cell:mouseup", schedule);
  return refresh;
}
