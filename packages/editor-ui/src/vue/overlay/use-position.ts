import { computed, shallowRef, watch, type CSSProperties } from "vue";
import { resolveOverlayBoundaryPosition } from "./boundary";
import { resolveEditorUIAnchoredOverlayStyle } from "./position";
import { readOverlayViewport } from "./viewport";
import type { EditorUIOverlayPositionSources } from "./types";

/**
 * Constrains one resident product surface without querying editor state on scroll.
 * @param sources - Live semantic geometry and product ownership.
 * @returns Positioning-only styles for the consumer's single visible surface.
 */
export function useOverlayBoundaryPosition(sources: EditorUIOverlayPositionSources) {
  const resolved = shallowRef<CSSProperties | null>(null);
  let schedule = (_refresh = false): void => {};
  const style = computed(() => resolved.value
    ?? resolveEditorUIAnchoredOverlayStyle(sources.anchor(), sources.placement()));

  watch([sources.visible, sources.root, sources.host], ([visible, root, host], _previous, onCleanup) => {
    resolved.value = null;
    if (!visible || !host || !root) return;
    const view = root.ownerDocument.defaultView;
    if (!view) return;
    const viewport = sources.viewport();
    let surface: HTMLElement | null = null;
    let frame = 0;
    let refresh = false;
    const observer = view.ResizeObserver ? new view.ResizeObserver((entries) => {
      schedule(entries.some(entry => entry.target !== surface));
    }) : null;

    /** Reads all geometry before publishing CSS; the retained target is document-local. */
    function update(): void {
      frame = 0;
      if (refresh) { refresh = false; sources.refreshAnchor(); }
      if (!surface?.isConnected) {
        surface = sources.surface();
        if (surface) observer?.observe(surface);
      }
      if (!surface) return;
      const boundary = readOverlayViewport(viewport);
      if (!boundary) return;
      const origin = host!.getBoundingClientRect();
      const size = surface.getBoundingClientRect();
      const anchor = sources.anchor();
      const position = resolveOverlayBoundaryPosition({
        anchor: { x: anchor.x + origin.left, y: anchor.y + origin.top,
          ...(anchor.rects === undefined ? {} : { rects: anchor.rects.map(rect => ({
            ...rect, x: rect.x + origin.left, y: rect.y + origin.top
          })) }) },
        placement: sources.placement(), boundary, surface: size
      });
      const maxWidth = Math.max(1, boundary.width - 16);
      const maxHeight = Math.max(1, boundary.height - 16);
      resolved.value = {
        ...resolveEditorUIAnchoredOverlayStyle({ x: position.x - origin.left, y: position.y - origin.top }, "exact"),
        maxWidth: `${maxWidth}px`, maxHeight: `${maxHeight}px`, boxSizing: "border-box",
        ...(surface.scrollHeight > maxHeight || surface.scrollWidth > maxWidth ? { overflow: "auto" } : {})
      };
    }

    // All invalidations share one frame. Scrolling only projects retained geometry;
    // semantic resolvers are reserved for resize/consumer target invalidation.
    schedule = (refreshTarget = false): void => {
      refresh ||= refreshTarget;
      if (!frame) frame = view.requestAnimationFrame(update);
    };
    /** @param event - Scroll owner; unrelated editors and child menus do not move this host. */
    const onScroll = (event: Event): void => {
      const target = event.target;
      if (target === root.ownerDocument || target === view.visualViewport
        || target instanceof view.Element && target.contains(host)) schedule();
    };
    const onResize = (): void => schedule(true);
    root.ownerDocument.addEventListener("scroll", onScroll, true);
    view.addEventListener("resize", onResize);
    view.visualViewport?.addEventListener("scroll", onScroll);
    view.visualViewport?.addEventListener("resize", onResize);
    observer?.observe(viewport);
    observer?.observe(host);
    schedule();
    onCleanup(() => {
      schedule = (): void => {};
      view.cancelAnimationFrame(frame);
      observer?.disconnect();
      root.ownerDocument.removeEventListener("scroll", onScroll, true);
      view.removeEventListener("resize", onResize);
      view.visualViewport?.removeEventListener("scroll", onScroll);
      view.visualViewport?.removeEventListener("resize", onResize);
    });
  }, { immediate: true, flush: "post" });
  watch([sources.anchor, sources.placement], () => schedule(), { flush: "post" });
  return style;
}
