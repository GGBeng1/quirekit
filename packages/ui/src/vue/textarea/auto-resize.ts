import { onBeforeUnmount, watch, type Ref } from "vue";
import type { TextareaAutoResizeOptions } from "./types";

const metricProperties = [
  "width", "box-sizing", "font-family", "font-size", "font-weight", "font-style",
  "font-variant", "line-height", "letter-spacing", "word-spacing", "text-indent",
  "text-transform", "tab-size", "white-space", "overflow-wrap", "word-break",
  "padding-top", "padding-bottom", "padding-left", "padding-right"
] as const;

/**
 * Sizes a native textarea without collapsing the focused element to measure it.
 * @param root - Component wrapper containing the native field.
 * @param value - Current displayed text.
 * @param options - Reactive minimum/maximum height policy.
 * @param appearance - Reactive density/count state that changes text metrics.
 */
export function useTextareaAutoResize(
  root: Ref<HTMLElement | undefined>,
  value: () => string,
  options: () => TextareaAutoResizeOptions,
  appearance: () => unknown
): void {
  let observer: ResizeObserver | undefined;
  let mirror: HTMLTextAreaElement | undefined;
  let frame: number | undefined;
  let view: Window | null = null;
  let metrics = "";
  let releaseFonts: (() => void) | undefined;

  /** Releases nodes and callbacks belonging to the previous mounted field. */
  function release(): void {
    observer?.disconnect();
    observer = undefined;
    releaseFonts?.();
    releaseFonts = undefined;
    if (frame !== undefined) view?.cancelAnimationFrame(frame);
    frame = undefined;
    mirror?.remove();
    mirror = undefined;
    metrics = "";
  }

  /** Schedules one measurement after the native value and CSS have settled. */
  function schedule(): void {
    if (frame !== undefined || !view) return;
    frame = view.requestAnimationFrame(() => { frame = undefined; measure(); });
  }

  /** Measures an isolated copy, then updates only the visible field's height. */
  function measure(): void {
    const field = root.value?.querySelector("textarea");
    if (!field || !view || !mirror) return;
    const policy = options();
    if (!policy.enabled) {
      field.style.removeProperty("height");
      field.style.removeProperty("min-height");
      return;
    }
    if (field.getBoundingClientRect().width === 0) return;
    const style = view.getComputedStyle(field);
    metrics = metricProperties.map(key => style.getPropertyValue(key)).join("|");
    for (const key of metricProperties) mirror.style.setProperty(key, style.getPropertyValue(key));
    mirror.value = field.value;
    const lineHeight = Number.parseFloat(style.lineHeight);
    if (!Number.isFinite(lineHeight)) return;
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const minimum = Math.max(1, Math.floor(policy.rows)) * lineHeight;
    const maximum = policy.maxRows === undefined ? Infinity
      : Math.max(minimum, Math.max(1, Math.floor(policy.maxRows)) * lineHeight);
    // scrollHeight includes padding; convert once to the field's CSS box space.
    const contentHeight = Math.max(minimum, Math.min(maximum, mirror.scrollHeight - padding));
    const height = contentHeight + (style.boxSizing === "border-box" ? padding : 0);
    field.style.minHeight = "0px";
    field.style.height = `${Math.ceil(height)}px`;
  }

  watch(root, element => {
    release();
    view = element?.ownerDocument.defaultView ?? null;
    if (!element || !view) return;
    mirror = element.ownerDocument.createElement("textarea");
    mirror.tabIndex = -1;
    mirror.setAttribute("aria-hidden", "true");
    mirror.style.cssText = "position:fixed;left:-10000px;top:0;height:0;min-height:0;max-height:none;border:0;visibility:hidden;pointer-events:none;overflow:hidden;resize:none;";
    element.ownerDocument.body.append(mirror);
    observer = new ResizeObserver(() => {
      const field = element.querySelector("textarea");
      if (!field || !view) return;
      const style = view.getComputedStyle(field);
      if (metricProperties.map(key => style.getPropertyValue(key)).join("|") !== metrics) schedule();
    });
    observer.observe(element);
    const fonts = element.ownerDocument.fonts;
    fonts?.addEventListener("loadingdone", schedule);
    releaseFonts = () => fonts?.removeEventListener("loadingdone", schedule);
    schedule();
  }, { flush: "post" });
  watch([value, options, appearance], schedule, { flush: "post" });
  onBeforeUnmount(release);
}
