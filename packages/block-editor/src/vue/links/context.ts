import { getMarkRange, posToDOMRect, type Editor } from "@quirekit/core";
import { normalizeLinkHref } from "@quirekit/extension-link";
import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from "vue";
import type { EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { isBlockLinkCurrent } from "../../links/commands";
import { restoreBlockEditorFocus } from "../../ui/focus";
import { useBlockLinkScope } from "./state";
import { observePastedWebLink } from "./paste";

/**
 * Owns delegated activation and the open-only document lease; the shared overlay owns scrolling.
 * @param editor - Canonical document session.
 * @param root - Mounted content host, excluding toolbars and embedded product shells.
 * @param surface - Currently mounted link card/form.
 * @returns Shared task state, retained geometry and explicit dismissal.
 */
export function useBlockLinkContext(editor: Editor, root: HTMLElement, surface: Ref<HTMLElement | undefined>) {
  const scope = useBlockLinkScope(editor);
  const anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
  let press: { x: number; y: number; id: number; link: HTMLAnchorElement } | null = null;
  let clicked: HTMLAnchorElement | null = null;
  let releasePaste: (() => void) | undefined;
  /** @returns Client-space geometry on opening/resizing only, never during scroll. */
  function measure(): EditorUIAnchoredOverlayAnchor | null {
    if (!scope.target.value || !editor.mountedView) return null;
    const { from, to } = scope.target.value.range ?? scope.target.value.selection;
    const rect = posToDOMRect(editor.view, from, to);
    return { x: rect.left + rect.width / 2, y: rect.bottom, rects: [{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }] };
  }
  /** @param focus - Whether the explicit dismissal returns to document input. */
  function close(focus = false): void { scope.close(); if (focus) restoreBlockEditorFocus(editor); }
  /** Revokes changed canonical sources without serializing or querying the whole document. */
  function changed(): void { if (scope.target.value && !isBlockLinkCurrent(editor, scope.target.value)) close(); }
  /** @param event - Root pointer press used only to distinguish clicks from completed drags. */
  function down(event: PointerEvent): void {
    clicked = null;
    const element = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    press = element && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId, link: element } : null;
  }
  /** @param event - Completed gesture; View retains exclusive selection ownership until the native click. */
  function up(event: PointerEvent): void {
    const source = press; press = null;
    if (!source || source.id !== event.pointerId || Math.hypot(event.clientX - source.x, event.clientY - source.y) > 4) return;
    // Pointer capture retargets the browser click to the View surface. Retain only
    // the pressed anchor; the following click supplies the true multi-click count.
    clicked = source.link;
  }
  /** Releases a cancelled gesture without opening a task. */
  function cancel(): void { press = null; clicked = null; }
  /** @param element - Pressed or keyboard-activated link. @param event - Completed activation. */
  function activate(element: HTMLAnchorElement, event: MouseEvent): void {
    if (!root.contains(element) || !editor.mountedView || event.button !== 0) return;
    const href = normalizeLinkHref(element.getAttribute("href"));
    const type = editor.state.schema.marks.link;
    if (!href || !type) return;
    const box = event.detail === 0 ? element.getClientRects()[0] : null;
    const hit = editor.view.posAtCoords({ left: box ? box.left + 1 : event.clientX, top: box ? (box.top + box.bottom) / 2 : event.clientY });
    if (!hit) return;
    const position = editor.state.doc.resolve(hit.pos);
    const owner = position.depth ? editor.view.nodeDOM?.(position.before()) : null;
    if (!owner?.contains(element)) return;
    const range = getMarkRange(position, type, { href })
      ?? getMarkRange(editor.state.doc.resolve(Math.max(0, hit.pos - 1)), type, { href });
    if (!range) return;
    // The mapped mark is authoritative: links inside an embedded editor have no
    // matching outer-document occurrence and keep their own event ownership.
    event.preventDefault();
    if (event.metaKey || event.ctrlKey) { root.ownerDocument.defaultView?.open(href, "_blank", "noopener,noreferrer"); return; }
    if (event.shiftKey || event.altKey || event.detail > 1) return;
    scope.close(); editor.commands.setTextSelection(range); scope.open(false);
  }
  /** @param event - Keyboard activation or native navigation following a captured pointer. */
  function click(event: MouseEvent): void {
    const element = event.detail === 0 && event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>("a[href]") : clicked;
    clicked = null;
    if (element) activate(element, event);
  }
  /** @param event - Keyboard task entry from the canonical editor only. */
  function shortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k"
      || !editor.isEditable || !editor.view.hasFocus() || !editor.state.schema.marks.link) return;
    event.preventDefault(); event.stopPropagation(); scope.open();
  }
  /** @param event - Outside pointer transfers ownership without restoring the old caret. */
  function outside(event: PointerEvent): void { if (!surface.value?.contains(event.target as Node)) close(); }
  /** @param event - Escape returns to the canonical selection; IME Escape remains native. */
  function escape(event: KeyboardEvent): void {
    if (event.key === "Escape" && !event.isComposing && !event.defaultPrevented) { event.preventDefault(); close(true); }
  }
  /** @param event - Keyboard focus leaving the card or document dismisses the task. */
  function focus(event: FocusEvent): void {
    if (!surface.value?.contains(event.target as Node) && !root.contains(event.target as Node)) close();
  }
  watch(scope.target, (target, previous) => {
    if (previous) {
      editor.off("transaction", changed); editor.off("update", changed);
      root.ownerDocument.removeEventListener("pointerdown", outside, true);
      root.ownerDocument.removeEventListener("keydown", escape);
      root.ownerDocument.removeEventListener("focusin", focus);
    }
    anchor.value = target ? measure() : null;
    if (target) {
      editor.on("transaction", changed); editor.on("update", changed);
      root.ownerDocument.addEventListener("pointerdown", outside, true);
      root.ownerDocument.addEventListener("keydown", escape);
      root.ownerDocument.addEventListener("focusin", focus);
    }
  }, { flush: "sync" });
  onMounted(() => {
    releasePaste = observePastedWebLink(editor, root, () => scope.open(false));
    root.addEventListener("pointerdown", down, true); root.addEventListener("click", click); root.addEventListener("keydown", shortcut);
    root.ownerDocument.addEventListener("pointerup", up); root.ownerDocument.addEventListener("pointercancel", cancel);
  });
  onBeforeUnmount(() => {
    releasePaste?.();
    close(); root.removeEventListener("pointerdown", down, true); root.removeEventListener("click", click); root.removeEventListener("keydown", shortcut);
    root.ownerDocument.removeEventListener("pointerup", up); root.ownerDocument.removeEventListener("pointercancel", cancel);
  });
  return { ...scope, anchor, measure, close };
}
