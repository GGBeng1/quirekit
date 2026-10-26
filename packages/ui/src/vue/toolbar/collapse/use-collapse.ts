import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { resolveQuireKitToolbarVisibleUnits } from "../../../components/toolbar/collapse";
import type { ToolbarCollapseBindings, ToolbarCollapseOptions } from "./types";
import { listToolbarCollapseSlots, splitToolbarCollapseSlots } from "./units";

/**
 * Moves trailing controls into a "more" panel when the row does not fit.
 *
 * Phases: each rendered control's inline advance (its width plus the gap or group edge before it)
 * is cached by key, so a container resize only re-runs the pure fit. A control never measured
 * forces one full render, measured in the post-flush watcher before paint, so the row never
 * flashes its overflowing state.
 *
 * @param options - Root, enablement and entries.
 * @returns Visible and collapsed entries.
 */
export function useToolbarCollapse(options: ToolbarCollapseOptions): ToolbarCollapseBindings {
  const count = ref<number | null>(null);
  const advances = new Map<string, number>();
  let moreAdvance = 0;
  let frame: number | undefined;
  let invalidated = false;
  const observed = new Set<HTMLElement>();
  const slots = computed(() => options.enabled() ? listToolbarCollapseSlots(options.items()) : []);
  // Only fields affecting inline geometry invalidate the cache. Accepted state
  // such as pressed/disabled/payload still updates controls without DOM reads.
  const geometry = computed(() => JSON.stringify([options.enabled(), options.metrics?.(), slots.value.map(({ key, entry }) =>
    [key, entry.kind, entry.text, entry.text === undefined && !(entry.icon || entry.iconData) ? entry.label : undefined,
      !!(entry.icon || entry.iconData), entry.span, entry.renderer]) ]));
  const split = computed(() => count.value === null ? undefined : splitToolbarCollapseSlots(slots.value, count.value));
  const visible = computed(() => split.value?.visible ?? options.items());
  const collapsed = computed(() => split.value?.collapsed ?? []);

  /** Caches advances of the controls and the "more" control currently in the row. */
  function measure(root: HTMLElement): void {
    const rtl = getComputedStyle(root).direction === "rtl";
    const gap = parseFloat(getComputedStyle(root).columnGap) || 0;
    let previous: number | undefined;
    const units = [...root.querySelectorAll<HTMLElement>("[data-qk-toolbar-unit]")].filter(element => element.closest('[role="toolbar"]') === root);
    const current = new Set(units);
    for (const element of observed) if (!current.has(element)) { observer?.unobserve(element); observed.delete(element); }
    for (const element of units) {
      if (!observed.has(element)) { observer?.observe(element); observed.add(element); }
      const rect = element.getBoundingClientRect();
      const end = rtl ? -rect.left : rect.right;
      // The first control's advance excludes the alignment offset before the row starts.
      advances.set(element.dataset.qkToolbarUnit!, previous === undefined ? rect.width : end - previous);
      previous = end;
    }
    const more = root.querySelector<HTMLElement>("[data-qk-toolbar-more]");
    if (more !== null) moreAdvance = more.getBoundingClientRect().width + gap;
    else if (moreAdvance === 0) {
      const first = root.querySelector<HTMLElement>("[data-qk-toolbar-unit]");
      moreAdvance = (first?.getBoundingClientRect().height ?? 28) + gap;
    }
  }

  /** Re-fits the row against the root's current content box. */
  function layout(): void {
    frame = undefined;
    const root = options.root.value;
    if (options.paused?.()) return;
    if (!options.enabled() || root === null) {
      count.value = null;
      return;
    }
    if (invalidated) {
      invalidated = false; advances.clear(); moreAdvance = 0;
      if (count.value !== null) { count.value = null; return; }
    }
    measure(root);
    const list = slots.value;
    if (list.some(slot => !advances.has(slot.key))) {
      count.value = null;
      return;
    }
    const style = getComputedStyle(root);
    const available = root.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd);
    const fitted = resolveQuireKitToolbarVisibleUnits(
      list.map(slot => ({ advance: advances.get(slot.key)!, separator: slot.entry.kind === "separator" })),
      available,
      moreAdvance
    );
    const next = fitted >= list.length ? null : fitted;
    if (next === count.value) return;
    preserveFocus(root, next);
    count.value = next;
  }

  /**
   * Moves focus to the "more" control when the focused control is about to collapse.
   * @param root - Toolbar root.
   * @param next - Upcoming visible count.
   */
  function preserveFocus(root: HTMLElement, next: number | null): void {
    if (next === null) return;
    const active = document.activeElement;
    const unit = active instanceof Element ? active.closest<HTMLElement>("[data-qk-toolbar-unit]") : null;
    if (unit === null || !root.contains(unit)) return;
    if (slots.value.findIndex(slot => slot.key === unit.dataset.qkToolbarUnit) < next) return;
    void nextTick(() => root.querySelector<HTMLElement>("[data-qk-toolbar-more] button")?.focus());
  }

  /** Coalesces resize bursts into one layout per frame. */
  function schedule(): void {
    if (frame === undefined) frame = requestAnimationFrame(layout);
  }

  let observer: ResizeObserver | undefined;
  onMounted(() => {
    observer = new ResizeObserver(schedule);
    if (options.root.value !== null) observer.observe(options.root.value);
    layout();
  });
  // Entry changes can add unmeasured controls or change widths; measure right after the DOM updates.
  watch(geometry, () => { invalidated = true; layout(); }, { flush: "post" });
  watch(count, layout, { flush: "post" });
  watch(() => options.paused?.() ?? false, paused => { if (!paused) layout(); }, { flush: "post" });
  onBeforeUnmount(() => {
    observer?.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return { visible, collapsed };
}
