import type { FlowRuntime, FlowTextInput } from "../types";

/** @param runtime - Graph transform authority. @param text - Native input boundary. @returns Listener cleanup. */
export function bindViewport(runtime: FlowRuntime, text: FlowTextInput): () => void {
  /** @param event - Standard pixel/line/page wheel event. */
  function wheel(event: WheelEvent): void {
    if ((event.target as HTMLElement).closest("textarea") || text.isComposing() || runtime.exporting) return;
    event.preventDefault(); event.stopPropagation();
    try { text.commit(); } catch (error) { runtime.fail(error); return; }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? runtime.mount.clientHeight : 1;
    const dx = event.deltaX * unit, dy = event.deltaY * unit;
    if (event.ctrlKey || event.metaKey) {
      const point = runtime.graph.clientToLocal(event.clientX, event.clientY), current = runtime.graph.zoom();
      const next = Math.max(0.1, Math.min(3, current * Math.exp(-dy * 0.002)));
      const before = runtime.graph.localToClient(point);
      runtime.graph.zoomTo(next);
      const after = runtime.graph.localToClient(point), translation = runtime.graph.translate();
      runtime.graph.translate(translation.tx + before.x - after.x, translation.ty + before.y - after.y);
    } else {
      const translation = runtime.graph.translate();
      runtime.graph.translate(translation.tx - dx, translation.ty - dy);
    }
  }
  runtime.mount.addEventListener("wheel", wheel, { passive: false });
  return () => runtime.mount.removeEventListener("wheel", wheel);
}
