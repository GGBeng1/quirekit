import { shallowRef, watch, type Ref } from "vue";
/** @param root - Explicit product container. @param dock - Actual bottom chrome. @param active - Only visible fixed chrome admits geometry work. @returns Shared CSS geometry, updated only on viewport/container events. */
export function useMobileViewport(root: Ref<HTMLElement | null>, dock: Ref<HTMLElement | null>, active: Ref<boolean>) {
  const style = shallowRef<Record<string, string>>({});
  watch([root, dock, active], ([element, bar, visible], _previous, cleanup) => {
    const win = element?.ownerDocument.defaultView;
    if (!visible || !element || !bar || !win) return;
    let frame = 0;
    /** Measures one owner-local container and its actual dock, independent from source transactions. */
    function measure(): void {
      frame = 0;
      const rect = element!.getBoundingClientRect(), visual = win!.visualViewport;
      const left = Math.max(rect.left, visual?.offsetLeft ?? 0), right = Math.min(rect.right, (visual?.offsetLeft ?? 0) + (visual?.width ?? win!.innerWidth));
      // Fixed chrome uses the layout viewport. iOS may shrink innerHeight while
      // its layout viewport remains tall; using that value leaves chrome behind
      // the keyboard/accessory strip. VisualViewport already excludes that UI.
      const layoutHeight = element!.ownerDocument.documentElement.clientHeight || win!.innerHeight;
      const bottom = Math.max(0, layoutHeight - ((visual?.offsetTop ?? 0) + (visual?.height ?? layoutHeight)));
      style.value = { left: `${left}px`, width: `${Math.max(0, right - left)}px`, bottom: `${bottom}px`,
        "--md-dock-safe-area": bottom > 0 ? "0px" : "env(safe-area-inset-bottom)" };
      element!.style.setProperty("--md-editor-dock-height", `${bar!.getBoundingClientRect().height + bottom}px`);
    }
    /** Shares one latest geometry projection per animation frame. */
    function schedule(): void { if (!frame) frame = win!.requestAnimationFrame(measure); }
    const observer = new win.ResizeObserver(schedule); observer.observe(element); observer.observe(bar);
    win.addEventListener("resize", schedule); win.addEventListener("scroll", schedule, { passive: true });
    win.visualViewport?.addEventListener("resize", schedule); win.visualViewport?.addEventListener("scroll", schedule);
    measure();
    cleanup(() => { observer.disconnect(); win.removeEventListener("resize", schedule); win.removeEventListener("scroll", schedule);
      win.visualViewport?.removeEventListener("resize", schedule); win.visualViewport?.removeEventListener("scroll", schedule);
      if (frame) win.cancelAnimationFrame(frame); element.style.removeProperty("--md-editor-dock-height"); });
  }, { flush: "post" });
  return style;
}
