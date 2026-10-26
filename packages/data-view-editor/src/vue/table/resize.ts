import { onBeforeUnmount, shallowRef, watch } from "vue";
import type { DataSet, DataTableView } from "@quirekit/data-view";
import type { ColumnWidthPreview } from "./types";

/** @param width - Proposed CSS width. @returns Bounded whole CSS pixels. */
function bounded(width: number): number { return Math.max(80, Math.min(1200, Math.round(width))); }

/** Owns one capture session; pointer previews never create document writes or queries.
 * @param view - Canonical table projection.
 * @param locked - Current authoring boundary.
 * @param commit - One complete view update at the end of a gesture.
 * @param source - Canonical snapshot, invalidating a gesture even when view settings are reused.
 * @returns Draft width and pointer/keyboard handlers for owned header separators.
 */
export function useColumnResize(view: () => DataTableView, locked: () => boolean, commit: (view: DataTableView) => void, source: () => DataSet) {
  const preview = shallowRef<ColumnWidthPreview | null>(null);
  let cleanup: (() => void) | undefined;
  /** Releases listeners, capture and pending frames without persisting a preview. */
  function cancel(): void { const release = cleanup; cleanup = undefined; release?.(); preview.value = null; }
  /** @param fieldId - Current column. @param width - Complete authored width. */
  function save(fieldId: string, width: number): void {
    if (!locked()) commit({...view(), columnWidths: {...view().columnWidths, [fieldId]: bounded(width)}});
  }
  /** @param event - Pointer on the owned separator. @param fieldId - Existing field. @param fallback - Authored width for unmeasured environments. */
  function start(event: PointerEvent, fieldId: string, fallback: number): void {
    if (locked() || event.button !== 0) return;
    cancel(); event.preventDefault(); event.stopPropagation();
    const handle = event.currentTarget as HTMLElement, header = handle.parentElement!;
    // Read one client-space geometry before any preview writes. Subsequent points need no DOM measurement.
    const width = header.getBoundingClientRect().width || fallback, origin = event.clientX, direction = getComputedStyle(header).direction === "rtl" ? -1 : 1;
    const controller = new AbortController(); let frame = 0, latest = origin;
    /** Presents only the latest coalesced point. */
    function paint(): void { frame = 0; preview.value = {fieldId, width: bounded(width + (latest - origin) * direction)}; }
    /** @param next - Latest point belonging to this capture. */
    function move(next: PointerEvent): void {
      if (next.pointerId !== event.pointerId) return;
      latest = next.clientX; if (!frame) frame = requestAnimationFrame(paint);
    }
    /** @param next - Final point; it must not depend on whether a preview frame already ran. */
    function end(next: PointerEvent): void {
      if (next.pointerId !== event.pointerId) return;
      const finalWidth = bounded(width + (next.clientX - origin) * direction);
      cancel(); if (next.clientX !== origin) save(fieldId, finalWidth);
    }
    cleanup = () => {
      controller.abort(); if (frame) cancelAnimationFrame(frame);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener("pointermove", move, {signal: controller.signal});
    handle.addEventListener("pointerup", end, {signal: controller.signal});
    handle.addEventListener("pointercancel", cancel, {signal: controller.signal});
    handle.addEventListener("lostpointercapture", cancel, {signal: controller.signal});
    handle.setPointerCapture(event.pointerId);
  }
  /** @param event - Accessible separator key. @param fieldId - Existing column. @param width - Authored width. */
  function key(event: KeyboardEvent, fieldId: string, width: number): void {
    if (event.key === "Escape" && cleanup) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
    if (locked() || event.isComposing || event.keyCode === 229) return;
    const direction = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl" ? -1 : 1;
    const next = event.key === "Home" ? 80 : event.key === "End" ? 1200 : event.key === "ArrowLeft" ? width - 10 * direction : event.key === "ArrowRight" ? width + 10 * direction : undefined;
    if (next === undefined) return;
    event.preventDefault(); event.stopPropagation(); cancel(); if (bounded(next) !== width) save(fieldId, next);
  }
  watch(() => [view(), locked(), source()], cancel);
  onBeforeUnmount(cancel);
  return {preview, start, key};
}
