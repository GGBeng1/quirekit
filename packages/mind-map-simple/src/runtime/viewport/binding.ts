import type { MindMapBounds } from "../overview/types";
import type { SimpleInstance } from "../../vendor/types";
import { boundedPan, clampMindMapZoom, wheelPixels } from "./math";

/**
 * Owns mount measurement and standard wheel input without document invalidations.
 * @param instance - Initialized renderer.
 * @param mount - Connected container and clipping boundary.
 * @param composing - Native input lifecycle guard.
 * @returns Viewport operations and cleanup.
 */
export function bindMindMapViewport(instance: SimpleInstance, mount: HTMLElement, composing: () => boolean) {
  let frame = 0;
  let dx = 0, dy = 0, zoom = 0, anchorX = 0, anchorY = 0;
  let resizePending = false;
  let width = mount.clientWidth, height = mount.clientHeight;
  /** Centers the current content bounds at the existing scale. */
  function center(): void {
    const bounds = instance.draw.bbox();
    instance.view.translateXY(instance.width / 2 - (bounds.x + bounds.width / 2) * instance.view.scale - instance.view.x,
      instance.height / 2 - (bounds.y + bounds.height / 2) * instance.view.scale - instance.view.y);
  }
  /** @param scale - Target ratio. @param x - Anchor x. @param y - Anchor y. */
  function setZoom(scale: number, x = instance.width / 2, y = instance.height / 2): void {
    instance.view.setScale(clampMindMapZoom(scale), x, y);
  }
  /** @param bounds - Natural content range to fit with a visible edge margin. */
  function fitBounds(bounds: MindMapBounds): void {
    setZoom(Math.min(1, Math.max(1, instance.width - 96) / Math.max(1, bounds.width),
      Math.max(1, instance.height - 96) / Math.max(1, bounds.height)));
    instance.view.translateXY(instance.width / 2 - (bounds.x + bounds.width / 2) * instance.view.scale - instance.view.x,
      instance.height / 2 - (bounds.y + bounds.height / 2) * instance.view.scale - instance.view.y);
  }
  /** Fits the complete rendered forest and annotations. */
  function fit(): void { fitBounds(instance.draw.bbox()); }
  /** Applies at most one resize and one bounded gesture per animation frame. */
  function flush(): void {
    frame = 0;
    if (resizePending) {
      resizePending = false;
      const nextWidth = mount.clientWidth, nextHeight = mount.clientHeight;
      if (nextWidth > 0 && nextHeight > 0 && (nextWidth !== width || nextHeight !== height)) {
        width = nextWidth; height = nextHeight; instance.resize();
      }
    }
    if (!composing()) {
      if (zoom) setZoom(instance.view.scale * Math.exp(Math.max(-0.12, Math.min(0.12, zoom))), anchorX, anchorY);
      if (dx || dy) instance.view.translateXY(...boundedPan(dx, dy));
    }
    dx = dy = zoom = 0;
  }
  /** Schedules one browser-frame update without delaying later input. */
  function schedule(): void { if (!frame) frame = requestAnimationFrame(flush); }
  /** @param event - Wheel event owned by this surface, never the surrounding page. */
  function wheel(event: WheelEvent): void {
    event.preventDefault(); event.stopImmediatePropagation();
    if (composing() || (event.target as Element).closest("[contenteditable]")) return;
    // The native overlay uses client coordinates. Commit before moving its SVG anchor.
    instance.renderer.textEdit.hideEditTextBox();
    const x = wheelPixels(event.deltaX, event.deltaMode, instance.width);
    const y = wheelPixels(event.deltaY, event.deltaMode, instance.height);
    if (event.ctrlKey || event.metaKey) {
      const rect = mount.getBoundingClientRect();
      anchorX = event.clientX - rect.left; anchorY = event.clientY - rect.top;
      zoom -= y * 0.0015;
    } else {
      dx -= (event.shiftKey && !x ? y : x) * 0.45;
      dy -= (event.shiftKey && !x ? 0 : y) * 0.45;
    }
    schedule();
  }
  const observer = new ResizeObserver(() => { resizePending = true; schedule(); });
  observer.observe(mount);
  mount.addEventListener("wheel", wheel, { capture: true, passive: false });
  return {
    setZoom, fit, fitBounds, center,
    /** Releases listeners and cancels pending resize/gesture work before vendor disposal. */
    dispose(): void {
      observer.disconnect(); cancelAnimationFrame(frame);
      mount.removeEventListener("wheel", wheel, true);
    },
  };
}
