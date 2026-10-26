import type { MountedPointerSelectionRenderMode } from "../pointer/session/types";

/**
 * Shares the pointer selection commit protocol across mounted backends.
 *
 * @param flushPending - Flushes transaction-owned work before inspecting its result.
 * @param isPresentationCurrent - Checks accepted presentation against current editor state.
 * @param requestSelection - Requests a view-local selection refresh through its scheduler.
 * @returns Stable pointer callback; an omitted mode preserves ordinary refresh behavior.
 */
export function createMountedPointerSelectionRenderer(
  flushPending: () => void,
  isPresentationCurrent: () => boolean,
  requestSelection: () => void
): (mode?: MountedPointerSelectionRenderMode) => void {
  return (mode = "request") => {
    if (mode === "flush-pending") {
      flushPending();
      // Direct construction may bypass the editor's mount registry. Only a
      // current accepted presentation proves that dispatch fulfilled the work.
      if (isPresentationCurrent()) {
        return;
      }
    }
    requestSelection();
  };
}
