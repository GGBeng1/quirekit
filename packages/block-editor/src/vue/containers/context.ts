import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import type { Editor } from "@quirekit/core";
import type { EditorUIAnchoredOverlayAnchor } from "@quirekit/editor-ui/vue";
import { restoreBlockEditorFocus } from "../../ui/focus";
import { useBlockContainerScope } from "./state";

/** @param editor - Canonical session. @param surface - Open form and its child overlays. @returns Open-only target lease and retained geometry. */
export function useBlockContainerContext(editor: Editor, surface: Ref<HTMLElement | undefined>) {
  const scope = useBlockContainerScope(editor), anchor = shallowRef<EditorUIAnchoredOverlayAnchor | null>(null);
  /** @returns Geometry at explicit open/resize; the document overlay owns scrolling. */
  function measure(): EditorUIAnchoredOverlayAnchor | null {
    if (!scope.target.value || !editor.mountedView) return null;
    const element = editor.view.nodeDOM?.(scope.target.value.position);
    if (!(element instanceof HTMLElement)) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top + 32 };
  }
  /** @param focus - Explicit dismissal restores document input, not an obsolete selection. */
  function close(focus = false): void { scope.close(); if (focus) restoreBlockEditorFocus(editor); }
  /** Revokes a changed source or selection without traversing the document. */
  function changed(): void {
    const target = scope.target.value;
    if (target && (!editor.isEditable || editor.state.doc !== target.doc || editor.state.pm.selection.from !== target.position)) close();
  }
  /** @param event - Native outside press. */
  function outside(event: PointerEvent): void { if (!surface.value?.contains(event.target as Node)) close(); }
  /** @param event - Escape bubbles only after inner menu/IME ownership. */
  function escape(event: KeyboardEvent): void { if (event.key === "Escape" && !event.defaultPrevented && !event.isComposing) { event.preventDefault(); close(true); } }
  let document: Document | undefined;
  watch(scope.target, (target, previous) => {
    if (previous) {
      editor.off("transaction", changed); editor.off("update", changed);
      document?.removeEventListener("pointerdown", outside, true); document?.removeEventListener("keydown", escape);
    }
    anchor.value = target ? measure() : null;
    if (target && editor.mountedView) {
      document = editor.view.dom.ownerDocument;
      editor.on("transaction", changed); editor.on("update", changed);
      document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", escape);
    }
  }, { flush: "sync" });
  onBeforeUnmount(() => close());
  return { ...scope, anchor, measure, close };
}
