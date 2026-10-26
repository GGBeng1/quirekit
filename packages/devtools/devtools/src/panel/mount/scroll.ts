/**
 * Scroll containers that `render` recreates wholesale. Their offsets are captured
 * before a re-render and restored after, so expanding a row (or any re-render) does
 * not snap the list back to the top.
 */
const SCROLL_CONTAINER_SELECTORS = [
  ".qk-devtools-json-tree",
  ".qk-devtools__log-scroll",
  ".qk-devtools-card-grid"
] as const;

/** One captured scroll container offset. */
interface QuireDevtoolsScrollOffset {
  /** Selector identifying the container. */
  readonly selector: string;
  /** Vertical scroll offset. */
  readonly top: number;
  /** Horizontal scroll offset. */
  readonly left: number;
}

/** Scroll offsets preserved across panel renders. */
export interface QuireDevtoolsPanelScrollState {
  /** Captured offsets for each present scroll container. */
  readonly offsets: readonly QuireDevtoolsScrollOffset[];
}

/**
 * Captures scroll offsets for panel regions that are recreated by render.
 *
 * @param root - Mounted devtools root.
 * @returns Captured panel scroll state.
 */
export function capturePanelScrollState(root: HTMLElement): QuireDevtoolsPanelScrollState {
  if (typeof root.querySelector !== "function") {
    return { offsets: [] };
  }

  const offsets: QuireDevtoolsScrollOffset[] = [];
  for (const selector of SCROLL_CONTAINER_SELECTORS) {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) {
      offsets.push({ selector, top: element.scrollTop, left: element.scrollLeft });
    }
  }

  return { offsets };
}

/**
 * Restores scroll offsets after the panel DOM has been recreated.
 *
 * @param root - Mounted devtools root.
 * @param state - Captured panel scroll state.
 */
export function restorePanelScrollState(
  root: HTMLElement,
  state: QuireDevtoolsPanelScrollState
): void {
  if (typeof root.querySelector !== "function") {
    return;
  }

  for (const offset of state.offsets) {
    const element = root.querySelector<HTMLElement>(offset.selector);
    if (element) {
      element.scrollTop = offset.top;
      element.scrollLeft = offset.left;
    }
  }
}
