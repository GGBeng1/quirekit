import type { QuireMountedTableChromeFragment } from "@quirekit/core";
import { computed, ref, watch } from "vue";
import { createTableResizeHitTest } from "./geometry";

/**
 * Discovers document-edge resize handles independently of the caret's column.
 * @param fragment - Existing mounted View geometry in client coordinates.
 * @param workspace - Active table's scrolling workspace.
 * @returns The one pointer-owned boundary, without adding selection decoration.
 */
export function useTableResizeHover(
  fragment: () => QuireMountedTableChromeFragment,
  workspace: () => HTMLElement
) {
  const boundaryId = ref<string | null>(null);
  let documentPointer: readonly [number, number] | null = null;
  const hitTest = computed(() => createTableResizeHitTest(fragment().resizes));
  watch(fragment, () => {
    // Hover discovery refreshes product geometry on the next frame. Recheck the
    // retained client point so equivalent geometry does not erase its handle.
    boundaryId.value = documentPointer === null ? null : hitTest.value(...documentPointer)?.id ?? null;
  });
  watch(workspace, (element, _previous, onCleanup) => {
    /** Clears stale geometry when the pointer leaves the active workspace. */
    function clear(): void { boundaryId.value = null; documentPointer = null; }
    /**
     * Queries retained geometry only for idle document pointers, never capture.
     * @param event - Workspace pointer movement in viewport CSS pixels.
     */
    function move(event: PointerEvent): void {
      if (event.buttons !== 0) return;
      const target = event.target;
      const ElementType = element.ownerDocument.defaultView?.Element;
      if (!ElementType || !(target instanceof ElementType)) {
        clear();
        return;
      }
      // An explicit rail-materialized handle already owns its axis, including
      // intersections. Discovery fills missing document hits, not that owner.
      const handle = target.closest("[data-table-resize-id]");
      if (handle) {
        documentPointer = null;
        boundaryId.value = handle.getAttribute("data-table-resize-id");
        return;
      }
      if (!target.closest(".qk-canvas-editor, .qk-svg-editor, .qk-html-editor")) {
        clear();
        return;
      }
      documentPointer = [event.clientX, event.clientY];
      boundaryId.value = hitTest.value(...documentPointer)?.id ?? null;
    }
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", clear, { passive: true });
    onCleanup(() => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", clear);
      clear();
    });
  }, { immediate: true });
  return boundaryId;
}
