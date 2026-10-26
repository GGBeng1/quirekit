import type { ClassicMobileShellOptions } from "./types";

/** @param percent - Free reading percentage. @param fit - Body-fit detent. @param locked - Previous detent state. @returns Snapped percentage and detent state. */
export function snapClassicMobileZoom(percent: number, fit: number | undefined, locked = false) {
  const snapped = fit !== undefined && Math.abs(percent / fit - 1) <= (locked ? 0.055 : 0.025);
  return { percent: Math.max(25, Math.min(400, Math.round(snapped ? fit! : percent))), snapped };
}

/**
 * Gives two-finger scaling to the document stage while leaving single-finger scroll native.
 * @param options - Instance and stage owners.
 * @returns Teardown for native touch events and queued scale work.
 */
export function bindClassicMobilePinch(options: ClassicMobileShellOptions): () => void {
  const viewport = options.elements.workspaceViewport;
  const win = viewport.ownerDocument.defaultView!;
  let startDistance = 0, startZoom = 100, frame = 0;
  let sample: { x: number; y: number; distance: number } | undefined;
  let snapped = false;
  /** @param event - Native touches. @returns Midpoint and distance for exactly two fingers. */
  function read(event: TouchEvent) {
    const [a, b] = Array.from(event.touches);
    return event.touches.length === 2 && a && b
      ? { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) }
      : undefined;
  }
  /** Commits at most one zoom intent per frame against the latest stage geometry. */
  function flush(): void {
    frame = 0;
    const context = options.model.context;
    if (!sample || !context || !startDistance) return;
    const rect = viewport.getBoundingClientRect();
    const next = snapClassicMobileZoom(startZoom * sample.distance / startDistance, options.stage.getContentFitZoom(), snapped);
    snapped = next.snapped;
    if (next.percent !== context.ui.state.zoom) {
      options.stage.setZoomAnchor(sample.x - rect.left, sample.y - rect.top);
      context.ui.setZoom(next.percent);
    }
  }
  /** @param event - Second finger establishes the document-owned gesture. */
  function start(event: TouchEvent): void {
    if (!options.model.compact || !options.model.context) return;
    const next = read(event);
    if (!next) return;
    event.preventDefault();
    sample = next;
    startDistance = next.distance;
    startZoom = options.model.context.ui.state.zoom;
    snapped = options.model.context.ui.state.zoomMode === "fit-content";
  }
  /** @param event - Pinch travel, never a single-finger scroll. */
  function move(event: TouchEvent): void {
    if (!startDistance) return;
    const next = read(event);
    if (!next) return;
    event.preventDefault();
    sample = next;
    if (!frame) frame = win.requestAnimationFrame(flush);
  }
  /** @param event - Release flushes the final sample and retains an acquired body-fit detent. */
  function end(event: TouchEvent): void {
    if (!startDistance || event.touches.length === 2) return;
    win.cancelAnimationFrame(frame);
    if (event.type !== "touchcancel") flush();
    if (snapped && event.type !== "touchcancel") options.model.context?.ui.setZoomMode("fit-content");
    frame = startDistance = 0;
    sample = undefined;
  }
  viewport.addEventListener("touchstart", start, { passive: false });
  viewport.addEventListener("touchmove", move, { passive: false });
  viewport.addEventListener("touchend", end);
  viewport.addEventListener("touchcancel", end);
  return () => {
    win.cancelAnimationFrame(frame);
    viewport.removeEventListener("touchstart", start);
    viewport.removeEventListener("touchmove", move);
    viewport.removeEventListener("touchend", end);
    viewport.removeEventListener("touchcancel", end);
  };
}
