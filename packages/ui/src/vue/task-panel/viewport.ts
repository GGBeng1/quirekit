import { shallowRef, watch, type Ref } from "vue";
/** @param trigger - Explicit owner document. @param open - Bottom physical lifetime only. @param maxHeight - Optional caller height bound. @returns Keyboard- and zoom-aware bottom content bounds. */
export function useTaskPanelViewport(trigger: Ref<HTMLElement | undefined>, open: Ref<boolean>, maxHeight: Ref<string | undefined>) {
  const style = shallowRef<Record<string, string>>({});
  watch([trigger, open, maxHeight], ([element, visible, limit], _old, cleanup) => {
    const win = element?.ownerDocument.defaultView;
    if (!visible || !win) return;
    let frame = 0;
    /** Projects layout CSS coordinates into the currently visible viewport. */
    function measure(): void {
      frame = 0;
      const visual = win!.visualViewport, height = visual?.height ?? win!.innerHeight;
      const offset = Math.max(0, win!.innerHeight - ((visual?.offsetTop ?? 0) + height));
      const available = `calc(${height}px - var(--qk-space-group))`;
      style.value = { maxHeight: limit ? `min(${available}, ${limit})` : available, marginBottom: `${offset}px` };
    }
    /** Shares one measurement for a viewport event burst. */
    function schedule(): void { if (!frame) frame = win!.requestAnimationFrame(measure); }
    win.addEventListener("resize", schedule); win.visualViewport?.addEventListener("resize", schedule); win.visualViewport?.addEventListener("scroll", schedule);
    measure();
    cleanup(() => { win.removeEventListener("resize", schedule); win.visualViewport?.removeEventListener("resize", schedule); win.visualViewport?.removeEventListener("scroll", schedule); if (frame) win.cancelAnimationFrame(frame); });
  }, { flush: "post" });
  return style;
}
