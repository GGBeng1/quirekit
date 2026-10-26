import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import type { RichContentSurface } from "../../rich-content/types";

/**
 * Retains one local preview height; canonical state changes only at commit.
 * @param surface - Current retained block.
 * @param node - Its latest immutable source.
 * @param editable - Live permission.
 * @returns Preview state and pointer/keyboard handlers.
 */
export function useWebPreviewResize(surface: RichContentSurface, node: Ref<PMNode>, editable: Ref<boolean>) {
  const height = ref<number | null>(null);
  let cleanup: (() => void) | undefined;
  /** @param value - Desired height. @param source - Captured node. */
  function apply(value: number, source = node.value): void {
    const position = surface.position();
    if (editable.value && position !== undefined) surface.editor.commands.resizeBlockWebCard(position, source, Math.round(Math.max(160, Math.min(800, value))));
  }
  /** @param event - Native separator navigation. */
  function key(event: KeyboardEvent): void {
    if (!editable.value || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    apply(event.key === "Home" ? 160 : event.key === "End" ? 800 : node.value.attrs.height + (event.key === "ArrowUp" ? -20 : 20));
  }
  /** @param event - Primary pointer at the bottom edge. */
  function drag(event: PointerEvent): void {
    if (!editable.value || !surface.editor.isEditable || event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault(); event.stopPropagation(); cleanup?.();
    const source = node.value, doc = surface.editor.state.doc, start = event.clientY, original = Number(source.attrs.height);
    const control = event.currentTarget as HTMLElement, owner = control.ownerDocument, win = owner.defaultView!;
    let latest = start, frame: number | undefined;
    height.value = original; control.setPointerCapture(event.pointerId);
    /** Projects the latest sample once per frame without measuring or dispatching. */
    function render(): void { frame = undefined; height.value = Math.round(Math.max(160, Math.min(800, original + latest - start))); }
    /** @param current - Latest sample for this pointer. */
    function move(current: PointerEvent): void { if (current.pointerId === event.pointerId) { latest = current.clientY; if (frame === undefined) frame = win.requestAnimationFrame(render); } }
    /** Restores the accepted height and releases all session ownership. */
    function stop(): void {
      if (frame !== undefined) win.cancelAnimationFrame(frame);
      owner.removeEventListener("pointermove", move); owner.removeEventListener("pointerup", up); owner.removeEventListener("pointercancel", cancel); owner.removeEventListener("keydown", escape);
      win.removeEventListener("blur", stop); surface.editor.off("update", changed);
      if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
      height.value = null; cleanup = undefined;
    }
    /** @param current - Final endpoint, not the last rendered frame. */
    function up(current: PointerEvent): void {
      if (current.pointerId !== event.pointerId) return;
      latest = current.clientY; const next = Math.round(Math.max(160, Math.min(800, original + latest - start))); stop();
      if (surface.editor.state.doc === doc && next !== original) apply(next, source);
    }
    /** @param current - Browser cancellation. */
    function cancel(current: PointerEvent): void { if (current.pointerId === event.pointerId) stop(); }
    /** @param current - Local cancellation shortcut. */
    function escape(current: KeyboardEvent): void { if (current.key === "Escape") { current.preventDefault(); stop(); } }
    /** Invalidates the pending preview as soon as its source becomes stale. */
    function changed(): void { if (surface.editor.state.doc !== doc || !surface.editor.isEditable) stop(); }
    cleanup = stop; owner.addEventListener("pointermove", move); owner.addEventListener("pointerup", up); owner.addEventListener("pointercancel", cancel); owner.addEventListener("keydown", escape);
    win.addEventListener("blur", stop); surface.editor.on("update", changed);
  }
  watch(editable, value => { if (!value) cleanup?.(); });
  onBeforeUnmount(() => cleanup?.());
  return { height, key, drag };
}
