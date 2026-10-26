import type { ClassicEditorShellRegions } from "../types";

/**
 * Keeps the fixed-height header in the document's horizontal scroll space.
 * @param elements - Stable shell hosts sharing one document scroll owner.
 * @returns Horizontal projection and focus lifecycle, without another scroll listener.
 */
export function createClassicEditorHeaderProjection(elements: ClassicEditorShellRegions) {
  const viewport = elements.workspaceViewport;
  const hosts = [elements.ruler, elements.workspaceToolbar];
  let projectedLeft = -1;

  /** Projects only changed horizontal offsets; vertical scrolling performs no style writes. */
  function sync(): void {
    const left = viewport.scrollLeft;
    if (left === projectedLeft) return;
    projectedLeft = left;
    elements.workspaceToolbar.style.setProperty("--qk-classic-workspace-scroll-left", `${left}px`);
  }

  /**
   * Reveals a focused header control through the same scroller as its document column.
   * @param event - Focus entering a ruler or companion control.
   */
  function revealFocusedControl(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const clip = viewport.getBoundingClientRect();
    const delta = rect.left < clip.left ? rect.left - clip.left - 4
      : rect.right > clip.right ? rect.right - clip.right + 4 : 0;
    if (delta === 0) return;
    // Only explicit focus may reveal a control. Ordinary scroll never pulls
    // the reader back, and the clipped ruler must not become another scroller.
    viewport.scrollLeft += delta;
    sync();
  }

  for (const host of hosts) host.addEventListener("focusin", revealFocusedControl);
  return {
    sync,
    /** Releases focus subscriptions with the stage owner. */
    destroy(): void {
      for (const host of hosts) host.removeEventListener("focusin", revealFocusedControl);
    }
  };
}
