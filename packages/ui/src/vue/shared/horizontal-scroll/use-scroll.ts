import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from "vue";
import { readScrollOffset, revealElement, wheelBelongsToChild, writeScrollOffset } from "./geometry";
import type { HorizontalScrollBindings, HorizontalScrollOptions } from "./types";

/**
 * Owns horizontal overflow without adding a second horizontal strip or keyboard registry.
 * @param options - Reactive root and public horizontal-scrolling options.
 * @returns Viewport refs, arrow state and delegated native interaction handlers.
 */
export function useHorizontalScroll(options: HorizontalScrollOptions): HorizontalScrollBindings {
  const viewport = shallowRef<HTMLElement | null>(null);
  const content = shallowRef<HTMLElement | null>(null);
  const overflowing = shallowRef(false);
  const canPrevious = shallowRef(false);
  const canNext = shallowRef(false);
  const rtl = shallowRef(false);
  const enabled = computed(() => options.enabled());
  let frame: number | undefined;
  let ownerWindow: Window | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let mutationObserver: MutationObserver | undefined;
  let disposed = false;
  let geometry = "";

  /** Reconciles logical edges without affecting the current scroll position. */
  function updateEdges(): void {
    const element = viewport.value;
    if (!element || !enabled.value || !overflowing.value) {
      canPrevious.value = canNext.value = false;
      return;
    }
    const offset = readScrollOffset(element, rtl.value);
    canPrevious.value = offset > 1;
    canNext.value = offset < element.scrollWidth - element.clientWidth - 1;
  }

  /** @param target - Focus target whose owning horizontal strip must match this root. */
  function reveal(target: EventTarget | null): void {
    const element = viewport.value;
    const constructor = element?.ownerDocument.defaultView?.HTMLElement;
    if (!element || !enabled.value || !constructor || !(target instanceof constructor)) return;
    if (!element.contains(target) || !options.ownsFocus(target)) return;
    const popup = target.closest('[data-scope="popover"][data-part="content"], [role="menu"], [role="listbox"]');
    if (popup && element.contains(popup)) return;
    revealElement(target, element, rtl.value);
    updateEdges();
  }

  /** Reads intrinsic content against the full root budget, independent of arrows. */
  function measure(): void {
    frame = undefined;
    const root = options.root.value;
    const row = content.value;
    const style = root && ownerWindow?.getComputedStyle(root);
    rtl.value = (options.direction() ?? style?.direction) === "rtl";
    const width = root && style ? root.clientWidth - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0) : 0;
    overflowing.value = enabled.value && width > 0 && !!row && row.scrollWidth > width + 1;
    updateEdges();
    const nextGeometry = `${width}:${row?.scrollWidth}:${viewport.value?.clientWidth}`;
    if (nextGeometry !== geometry) {
      geometry = nextGeometry;
      reveal(root?.ownerDocument.activeElement ?? null);
    }
  }

  /** Coalesces resize and content changes to avoid reading during observer delivery. */
  function scheduleMeasure(): void {
    if (!disposed && frame === undefined) frame = ownerWindow?.requestAnimationFrame(measure);
  }

  /** Releases the exact observers and animation frame belonging to one mounted viewport. */
  function disconnect(): void {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    if (frame !== undefined) ownerWindow?.cancelAnimationFrame(frame);
    frame = undefined;
  }

  watch([options.root, viewport, content, enabled, options.direction], () => {
    disconnect();
    const root = options.root.value;
    const element = viewport.value;
    const row = content.value;
    ownerWindow = root?.ownerDocument.defaultView ?? undefined;
    if (!root || !element || !row || !ownerWindow || !enabled.value) { overflowing.value = false; return; }
    resizeObserver = new ResizeObserver(scheduleMeasure);
    for (const target of [root, element, row]) resizeObserver.observe(target);
    mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(row, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden", "dir"] });
    mutationObserver.observe(root, { attributes: true, attributeFilter: ["class", "style", "hidden", "dir"] });
    // Inherited direction can change without resizing either the root or row.
    for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement) {
      mutationObserver.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "dir"] });
    }
    scheduleMeasure();
  }, { flush: "post" });
  watch(overflowing, () => { void nextTick(scheduleMeasure); });
  onBeforeUnmount(() => { disposed = true; disconnect(); });

  /** @param step - Previous or next logical screen. */
  function scrollPage(step: -1 | 1): void {
    const element = viewport.value;
    if (!element || !enabled.value) return;
    const reduced = ownerWindow?.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amount = Math.max(1, element.clientWidth * 0.8);
    writeScrollOffset(element, readScrollOffset(element, rtl.value) + step * amount, rtl.value, reduced ? "instant" : "smooth");
    updateEdges();
  }

  /** @param event - Native field or action focus entering the viewport. */
  function revealFocused(event: FocusEvent): void { reveal(event.target); }

  /** @param event - Vertical wheel input that no child control or native horizontal gesture owns. */
  function handleWheel(event: WheelEvent): void {
    const element = viewport.value;
    const constructor = element?.ownerDocument.defaultView?.Element;
    if (!element || !enabled.value || !overflowing.value || !event.cancelable || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.deltaX !== 0 || event.deltaY === 0) return;
    if (!constructor || !(event.target instanceof constructor) || wheelBelongsToChild(event.target, element)) return;
    const multiplier = event.deltaMode === 2 ? element.clientWidth : event.deltaMode === 1 ? Number.parseFloat(ownerWindow?.getComputedStyle(element).lineHeight ?? "") || 20 : 1;
    const offset = readScrollOffset(element, rtl.value);
    const next = Math.max(0, Math.min(element.scrollWidth - element.clientWidth, offset + event.deltaY * multiplier));
    if (Math.abs(next - offset) < 0.5) return;
    event.preventDefault();
    writeScrollOffset(element, next, rtl.value, "instant");
    updateEdges();
  }

  return { viewport, content, enabled, overflowing, canPrevious, canNext, rtl, scrollPage, revealFocused, handleWheel, updateEdges };
}
