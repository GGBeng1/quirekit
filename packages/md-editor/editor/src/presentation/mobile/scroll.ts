import type { EditorView } from "@quirekit/cm-view";
import { applySourceScrollStep, sourceScrollStep, sourceViewport, type SourceClientPoint, type SourceViewportBounds } from "@quirekit/msfe-core";
import { mobileHandleMargin } from "./geometry";

/** @param view - Actual clipping/host owner. @returns Visible space for text plus its rendered touch endpoint. */
function dragViewport(view: EditorView): SourceViewportBounds {
  const bounds = sourceViewport(view), margin = Math.min(mobileHandleMargin, Math.max(0, (bounds.bottom - bounds.top - 20) / 2));
  return { ...bounds, top: bounds.top + margin, bottom: bounds.bottom - margin };
}

/** @param point - Latest adjusted endpoint, including points over chrome. @param bounds - Actual editing region. @returns A hit-test point inside visible content. */
export function mobileViewportPoint(point: SourceClientPoint, bounds: SourceViewportBounds): SourceClientPoint {
  return { x: Math.max(bounds.left + 2, Math.min(bounds.right - 2, point.x)), y: Math.max(bounds.top + 2, Math.min(bounds.bottom - 2, point.y)) };
}

/** @param point - Raw adjusted endpoint. @param bounds - Unobscured editing region. @param elapsed - Frame time in milliseconds. @returns Bounded client-pixel movement near either vertical edge. */
export function mobileEdgeDelta(point: SourceClientPoint, bounds: SourceViewportBounds, elapsed = 16): number {
  const band = Math.min(40, (bounds.bottom - bounds.top) / 3);
  if (band <= 0) return 0;
  const depth = point.y < bounds.top + band ? -Math.min(1, (bounds.top + band - point.y) / band)
    : point.y > bounds.bottom - band ? Math.min(1, (point.y - bounds.bottom + band) / band) : 0;
  return depth * 720 * Math.max(0, Math.min(32, elapsed)) / 1000;
}

/** Instance-local edge scrolling; the native surface retains document/selection authority. */
export class MobileSelectionScroll {
  private readonly win;
  private point: SourceClientPoint | undefined;
  private frame: number | undefined;
  private time: number | undefined;

  /** @param view - Mounted scroll/geometry authority. @param enabled - Current accepted gesture guard. @param track - Canonical endpoint acceptance, once per current frame. */
  constructor(private readonly view: EditorView, private readonly enabled: () => boolean, private readonly track: (point: SourceClientPoint) => void) {
    this.win = view.dom.ownerDocument.defaultView!;
  }

  /** @param point - Latest public handle point, after its stable grab offset. */
  move(point: SourceClientPoint): void {
    if (!this.enabled()) { this.cancel(); return; }
    this.point = point;
    const bounds = dragViewport(this.view);
    if (bounds.bottom - bounds.top < 4) { this.cancel(); return; }
    this.track(mobileViewportPoint(point, bounds));
    if (this.point && this.enabled() && mobileEdgeDelta(point, bounds)) this.schedule(); else this.cancel();
  }

  /** Retain one animation frame regardless of native pointer sample frequency. */
  private schedule(): void { if (this.frame === undefined) this.frame = this.win.requestAnimationFrame(this.tick); }

  /** @param time - Owner-window animation timestamp; long pauses never create a large jump. */
  private readonly tick = (time: number): void => {
    this.frame = undefined;
    if (!this.point || !this.enabled()) { this.cancel(); return; }
    const point = this.point, bounds = dragViewport(this.view);
    const delta = mobileEdgeDelta(point, bounds, this.time === undefined ? 16 : time - this.time);
    this.time = time;
    if (!delta || bounds.bottom - bounds.top < 4) { this.cancel(); return; }
    const step = sourceScrollStep(this.view, delta);
    // Read this frame's hit against geometry accepted after the previous scroll.
    // Then perform the measured write; the next frame replays even when the
    // finger is stationary, without synthesizing pointer events or native Range.
    this.track(mobileViewportPoint(point, bounds));
    if (step && this.point && this.enabled()) { applySourceScrollStep(step); this.schedule(); }
    else this.cancel();
  };

  /** Stop immediately on release/cancel/ownership loss, preserving the accepted selection. */
  cancel(): void {
    if (this.frame !== undefined) this.win.cancelAnimationFrame(this.frame);
    this.frame = undefined; this.point = undefined; this.time = undefined;
  }
}
