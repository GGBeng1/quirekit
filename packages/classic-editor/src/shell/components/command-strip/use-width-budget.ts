import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Ref
} from "vue";
import {
  resolveClassicEditorCommandStripBudget,
  mergeClassicEditorIntrinsicWidths,
  retainClassicEditorSourceWidths,
  type ResolvedClassicEditorCommandStripGroup
} from "../../contribution/command-strip";

/** Reactive inputs consumed by the measured Command Strip budget. */
export interface ClassicEditorCommandWidthBudgetInput {
  /** Active task groups in source order. */
  readonly groups: Readonly<Ref<readonly ResolvedClassicEditorCommandStripGroup[]>>;
  /** Locale identity used to invalidate cached text widths. */
  readonly locale: Readonly<Ref<string>>;
}

/** Reactive measured budget exposed to the Command Strip presenter. */
export interface ClassicEditorCommandWidthBudget {
  /** Root toolbar element observed for available width. */
  readonly root: Ref<HTMLElement | undefined>;
  /** Root content-box width available to groups and the overflow trigger. */
  readonly availableWidth: Readonly<Ref<number>>;
  /** Group ids retained directly in the strip. */
  readonly visibleIds: Readonly<Ref<readonly string[]>>;
  /** Group ids available through overflow. */
  readonly overflowIds: Readonly<Ref<readonly string[]>>;
  /** Captures the mounted width-budget owner element. */
  readonly captureRoot: (value: Element | null) => void;
  /** Captures and observes one rendered group element. */
  readonly captureGroup: (id: string, value: Element | null) => void;
  /** Re-reads root and group dimensions after a layout boundary. */
  readonly measure: () => void;
}

/**
 * Observes available and intrinsic widths without hiding undiscoverable actions.
 *
 * @param input - Active groups and locale invalidation source.
 * @returns Reactive direct/overflow group projection.
 */
export function useClassicEditorCommandWidthBudget(
  input: ClassicEditorCommandWidthBudgetInput
): ClassicEditorCommandWidthBudget {
  const root = ref<HTMLElement>();
  const availableWidth = ref(0);
  const groupWidths = ref<Readonly<Record<string, number>>>({});
  const groupElements = new Map<string, HTMLElement>();
  let observer: ResizeObserver | undefined;
  const budget = computed(() => resolveClassicEditorCommandStripBudget(
    input.groups.value,
    Object.entries(groupWidths.value).map(([id, width]) => ({ id, width })),
    availableWidth.value,
    readTokenLength(root.value, "--qk-control-default"),
    readTokenLength(root.value, "--qk-space-inline-tight")
  ));
  const visibleIds = computed(() => budget.value.visibleIds);
  const overflowIds = computed(() => budget.value.overflowIds);

  /** Reads current root and rendered group dimensions into one immutable revision. */
  function measure(): void {
    const element = root.value;
    if (element === undefined) return;
    availableWidth.value = readClassicEditorCommandContentBoxWidth(element);
    groupWidths.value = mergeClassicEditorIntrinsicWidths(
      groupWidths.value,
      [...groupElements].map(([id, group]) => ({
        id,
        width: group.getBoundingClientRect().width
      }))
    );
  }

  /**
   * Captures a rendered group while retaining its last known width after overflow.
   *
   * @param id - Stable resolved group id.
   * @param value - Current Vue element ref or null after unmount.
   */
  function captureGroup(id: string, value: Element | null): void {
    const previous = groupElements.get(id);
    if (previous === value) return;
    if (previous !== undefined && previous !== value) observer?.unobserve(previous);
    if (!(value instanceof HTMLElement)) {
      groupElements.delete(id);
      return;
    }
    groupElements.set(id, value);
    observer?.observe(value);
    queueMeasure();
  }

  /**
   * Captures and observes the actual toolbar root behind the nested composable.
   *
   * @param value - Current Vue element ref or null after unmount.
   */
  function captureRoot(value: Element | null): void {
    const previous = root.value;
    if (previous === value) return;
    if (previous !== undefined && previous !== value) observer?.unobserve(previous);
    root.value = value instanceof HTMLElement ? value : undefined;
    if (root.value !== undefined) observer?.observe(root.value);
    queueMeasure();
  }

  /** Schedules measurement after Vue has committed the current projection. */
  function queueMeasure(): void {
    void nextTick(measure);
  }

  watch(input.groups, (groups) => {
    groupWidths.value = retainClassicEditorSourceWidths(
      groupWidths.value,
      groups.map((group) => group.id)
    );
    queueMeasure();
  });

  watch(input.locale, () => {
    groupWidths.value = {};
    queueMeasure();
  });

  onMounted(() => {
    const ResizeObserverConstructor = root.value?.ownerDocument.defaultView?.ResizeObserver;
    if (ResizeObserverConstructor !== undefined) {
      observer = new ResizeObserverConstructor(measure);
      if (root.value !== undefined) observer.observe(root.value);
      for (const group of groupElements.values()) observer.observe(group);
    }
    measure();
  });

  onBeforeUnmount(() => observer?.disconnect());

  return {
    root,
    availableWidth,
    visibleIds,
    overflowIds,
    captureRoot,
    captureGroup,
    measure
  };
}

/**
 * Resolves the inline content-box budget used by the flex projection.
 *
 * `clientWidth` includes padding, but Command Strip groups cannot occupy that
 * padded space. Subtracting logical inline padding keeps the last direct group
 * from being clipped while the budget incorrectly reports that it fits.
 *
 * @param element - Mounted Command Strip root.
 * @returns Finite non-negative content-box width in CSS pixels.
 */
export function readClassicEditorCommandContentBoxWidth(element: HTMLElement): number {
  const view = element.ownerDocument.defaultView;
  if (view === null) return 0;
  const style = view.getComputedStyle(element);
  const start = finiteCssLength(style.paddingInlineStart);
  const end = finiteCssLength(style.paddingInlineEnd);
  return Math.max(0, element.clientWidth - start - end);
}

/**
 * Reads a semantic CSS length from the mounted product theme.
 *
 * @param element - Current Command Strip root.
 * @param property - Semantic custom-property name.
 * @returns Finite CSS-pixel value or zero before mount.
 */
function readTokenLength(element: HTMLElement | undefined, property: string): number {
  const view = element?.ownerDocument.defaultView;
  if (element === undefined || view === null || view === undefined) return 0;
  const value = Number.parseFloat(view.getComputedStyle(element).getPropertyValue(property));
  return Number.isFinite(value) ? value : 0;
}

/** @param value - Computed CSS length. @returns Finite CSS pixels or zero. */
function finiteCssLength(value: string): number {
  const length = Number.parseFloat(value);
  return Number.isFinite(length) ? length : 0;
}
