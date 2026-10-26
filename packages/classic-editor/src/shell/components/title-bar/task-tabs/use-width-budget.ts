import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
  type Ref
} from "vue";
import type { ClassicEditorRibbonTabContribution, QuireKitTheme } from "@classic/types";
import {
  mergeClassicEditorIntrinsicWidths,
  resolveClassicEditorTaskTabBudget
} from "../../../contribution/command-strip";

/** Reactive inputs for measured task-tab overflow. */
export interface ClassicEditorTaskTabWidthInput {
  /** Applicable task tabs in source order. */
  readonly tabs: Readonly<Ref<readonly ClassicEditorRibbonTabContribution[]>>;
  /** Current active task id. */
  readonly activeId: Readonly<Ref<string | undefined>>;
  /** Locale identity used to invalidate cached label widths. */
  readonly locale: Readonly<Ref<string>>;
  /** Immutable theme identity, including tokens that can change overflow spacing. */
  readonly theme?: Readonly<Ref<QuireKitTheme>>;
}

/** Measured task-tab projection returned to the row presenter. */
export interface ClassicEditorTaskTabWidthBudget {
  /** Tab-row measurement root. */
  readonly root: Ref<HTMLElement | undefined>;
  /** Directly visible task ids. */
  readonly visibleIds: Readonly<Ref<readonly string[]>>;
  /** Task ids reachable through overflow. */
  readonly overflowIds: Readonly<Ref<readonly string[]>>;
  /** Captures the mounted tablist measurement owner. */
  readonly captureRoot: (
    element: Element | ComponentPublicInstance | null
  ) => void;
  /** Captures one rendered tab button. */
  readonly captureTab: (id: string, element: Element | null) => void;
}

/**
 * Observes the task row and retains intrinsic widths after tabs move to overflow.
 *
 * @param input - Applicable tabs, active id, and locale revision.
 * @returns Reactive direct and overflow tab ids.
 */
export function useClassicEditorTaskTabWidthBudget(
  input: ClassicEditorTaskTabWidthInput
): ClassicEditorTaskTabWidthBudget {
  const root = ref<HTMLElement>();
  const availableWidth = ref(0);
  const widths = ref<Readonly<Record<string, number>>>({});
  const overflowWidth = ref(0);
  const gap = ref(0);
  const elements = new Map<string, HTMLElement>();
  let observer: ResizeObserver | undefined;
  let fonts: FontFaceSet | undefined;
  let frame: number | undefined;
  let queued = false;
  let disposed = false;
  // Selection creates new contribution arrays without changing intrinsic labels.
  const sourceKey = computed(() => JSON.stringify(input.tabs.value.map(tab => [
    tab.id, tab.order, typeof tab.label === "string"
      ? tab.label : [tab.label["zh-CN"], tab.label.en]
  ])));
  const budget = computed(() => resolveClassicEditorTaskTabBudget(
    input.tabs.value,
    Object.entries(widths.value).map(([id, width]) => ({ id, width })),
    availableWidth.value,
    overflowWidth.value,
    gap.value,
    input.activeId.value
  ));
  const visibleIds = computed(() => budget.value.visibleIds);
  const overflowIds = computed(() => budget.value.overflowIds);

  /** Reads current available and intrinsic tab widths. */
  function measure(): void {
    if (disposed || root.value === undefined) return;
    const style = root.value.ownerDocument.defaultView?.getComputedStyle(root.value);
    overflowWidth.value = readToken(style, "--qk-control-default");
    gap.value = readToken(style, "--qk-space-inline-tight");
    availableWidth.value = root.value.clientWidth;
    widths.value = mergeClassicEditorIntrinsicWidths(
      widths.value,
      [...elements].map(([id, element]) => ({
        id,
        // A compressed or overflow-hidden tab must not shrink the intrinsic cache.
        width: Math.max(element.getBoundingClientRect().width, element.scrollWidth)
      }))
    );
  }

  /** Measures after the ResizeObserver delivery phase, without resizing its own observed targets. */
  function scheduleMeasure(): void {
    const view = root.value?.ownerDocument.defaultView;
    if (disposed || frame !== undefined || !view) return;
    frame = view.requestAnimationFrame(() => { frame = undefined; measure(); });
  }

  /** Coalesces source, locale and mounted-ref changes after the current Vue commit. */
  function queueMeasure(): void {
    if (disposed || queued) return;
    queued = true;
    void nextTick(() => { queued = false; measure(); });
  }

  /** Invalidates hidden intrinsic widths too, so changed labels can return from overflow. */
  function invalidateWidths(): void {
    if (disposed) return;
    widths.value = {};
    queueMeasure();
  }

  /**
   * Captures one tab element while retaining its cached width after overflow.
   *
   * @param id - Stable task id.
   * @param element - Current tab button or null after unmount.
   */
  function captureTab(id: string, element: Element | null): void {
    const previous = elements.get(id);
    if (previous === element) return;
    if (previous !== undefined && previous !== element) observer?.unobserve(previous);
    if (!(element instanceof HTMLElement)) {
      elements.delete(id);
      return;
    }
    elements.set(id, element);
    observer?.observe(element);
    queueMeasure();
  }

  /**
   * Captures and observes the actual tablist root behind the composable.
   *
   * @param value - Mounted tablist element, component root, or null after unmount.
   */
  function captureRoot(value: Element | ComponentPublicInstance | null): void {
    const element = value !== null && "$el" in value ? value.$el : value;
    const previous = root.value;
    if (previous === element) return;
    if (previous !== undefined && previous !== element) observer?.unobserve(previous);
    root.value = element instanceof HTMLElement ? element : undefined;
    if (root.value !== undefined) observer?.observe(root.value);
    queueMeasure();
  }

  watch([sourceKey, input.locale, () => input.theme?.value], invalidateWidths);

  onMounted(() => {
    const ResizeObserverConstructor = root.value?.ownerDocument.defaultView?.ResizeObserver;
    if (ResizeObserverConstructor !== undefined) {
      observer = new ResizeObserverConstructor(scheduleMeasure);
      if (root.value !== undefined) observer.observe(root.value);
      for (const element of elements.values()) observer.observe(element);
    }
    fonts = root.value?.ownerDocument.fonts;
    fonts?.addEventListener("loadingdone", invalidateWidths);
    queueMeasure();
  });

  onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect();
    fonts?.removeEventListener("loadingdone", invalidateWidths);
    if (frame !== undefined) root.value?.ownerDocument.defaultView?.cancelAnimationFrame(frame);
  });
  return { root, visibleIds, overflowIds, captureRoot, captureTab };
}

/** @param style - Measured row style. @param property - Semantic length token. @returns CSS pixels. */
function readToken(style: CSSStyleDeclaration | undefined, property: string): number {
  const value = Number.parseFloat(style?.getPropertyValue(property) ?? "");
  return Number.isFinite(value) ? value : 0;
}
