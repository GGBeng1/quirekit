import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from "vue";
import type { EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import type { RichContentSurface } from "../../rich-content/types";
import { claimBlockObjectToolbar, releaseBlockObjectToolbar } from "./ownership";
import { observeBlockObjectSelection } from "./selection";

/**
 * Owns hover/focus across one source and its teleported tools. Only the active object reads geometry.
 * @param surface - Retained source mount.
 * @param enabled - Whether any actions are available.
 * @param pinned - Keeps controls reachable while an embedded page owns input.
 * @returns Activity handlers and a client-space anchor for the shared overlay.
 */
export function useBlockObjectTools(surface: RichContentSurface, enabled: Ref<boolean>, pinned: Ref<boolean>) {
  const anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null), visible = shallowRef(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sourceHover = false, toolHover = false, toolFocus = false, menuOpen = false;
  let selected = false, releaseSelection: (() => void) | undefined;
  const root = surface.dom;
  /** Measures this object only; scrolling uses the overlay's retained document-local geometry. @returns Current client anchor. */
  function measure(): EditorUIAnchoredOverlayAnchor | null {
    if (!root.isConnected || !visible.value) return null;
    const rect = root.getBoundingClientRect();
    const next = { x: rect.x + rect.width / 2, y: rect.y, rects: [{ x: rect.x, y: rect.y, width: rect.width, height: rect.height }] };
    anchor.value = next; return next;
  }
  /** Cancels the pointer crossing grace period without delaying geometry updates. */
  function clear(): void { if (timer !== undefined) { clearTimeout(timer); timer = undefined; } }
  /** Claims the single active toolbar without changing the editor selection. */
  function activate(): void {
    clear();
    if (enabled.value) {
      // Only the old and new active surface update; hidden objects do not subscribe to each hover.
      visible.value = claimBlockObjectToolbar(surface.editor, root, () => { clear(); visible.value = false; });
    }
  }
  /** Hides only after both the source and the floating controls have been left. */
  function settle(): void {
    clear(); timer = setTimeout(() => {
      timer = undefined;
      const focused = root.contains(root.ownerDocument.activeElement);
      if (!sourceHover && !toolHover && !toolFocus && !menuOpen && !selected && !pinned.value && !focused) releaseBlockObjectToolbar(surface.editor, root);
    }, 220);
  }
  /** @param event - Nested nodes claim their own tools rather than exposing the outer container. */
  function enter(event: Event): void {
    if (!(event.target instanceof Element) || event.target.closest("[data-qk-rich]") !== root) return;
    sourceHover = event.type === "pointerover" || sourceHover; activate();
  }
  /** Leaves space for the pointer to cross the small gap above the source. */
  function leave(): void { sourceHover = false; settle(); }
  /** @param inside - Whether the pointer is in the teleported toolbar. */
  function hover(inside: boolean): void { toolHover = inside; if (inside) activate(); else settle(); }
  /** @param inside - Whether keyboard focus is in the toolbar. */
  function focus(inside: boolean): void { toolFocus = inside; if (inside) activate(); else settle(); }
  /** @param expanded - Whether a toolbar child popup owns focus. */
  function popup(expanded: boolean): void { menuOpen = expanded; if (expanded) activate(); else settle(); }

  watch(visible, (show, _old, cleanup) => {
    if (!show) { anchor.value = null; return; }
    measure();
    const observer = new ResizeObserver(measure); observer.observe(root);
    // Only this visible object listens for document movement; selection changes do no layout work.
    const update = (): void => { measure(); };
    surface.editor.on("update", update);
    cleanup(() => { observer.disconnect(); surface.editor.off("update", update); });
  }, { flush: "post" });
  watch(enabled, value => { if (!value) releaseBlockObjectToolbar(surface.editor, root); });
  watch(pinned, value => { if (!value) settle(); });
  onMounted(() => {
    releaseSelection = observeBlockObjectSelection(root, value => { if (selected === value) return; selected = value; if (value) activate(); else settle(); });
    root.addEventListener("pointerover", enter); root.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", enter); root.addEventListener("focusout", settle);
  });
  onBeforeUnmount(() => {
    releaseSelection?.(); clear(); releaseBlockObjectToolbar(surface.editor, root);
    root.removeEventListener("pointerover", enter); root.removeEventListener("pointerleave", leave);
    root.removeEventListener("focusin", enter); root.removeEventListener("focusout", settle);
  });
  return { visible, anchor, measure, hover, focus, popup };
}
