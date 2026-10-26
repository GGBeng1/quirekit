import { computed, watch, type Ref } from "vue";
import { EditorView } from "@quirekit/cm-view";
import type { EditorState } from "@quirekit/cm-state";
import { sourceInputHasFocus, readSourcePresentation, type MsfeEditor } from "@quirekit/msfe-core";

/**
 * Keeps CM's existing caret as a passive position hint after chrome takes focus.
 * @param editor - Mounted source owner; replacement releases all native listeners.
 * @param state - Existing accepted state, used only for fixed lifetime/permission metadata.
 */
export function useRetainedSelection(editor: Readonly<Ref<MsfeEditor | undefined>>, state: Readonly<Ref<EditorState | undefined>>): void {
  const scope = computed(() => { void state.value; return editor.value?.documentScope; });
  const disabled = computed(() => !editor.value || state.value?.readOnly || editor.value.mode === "locked");
  watch(editor, (current, _previous, cleanup) => {
    if (!current) return;
    const view = EditorView.findFromDOM(current.element), doc = current.element.ownerDocument, win = doc.defaultView;
    if (!view || !win) return;
    let seen = !disabled.value && sourceInputHasFocus(view), composing = view.composing, windowActive = doc.hasFocus(), lifetime = current.documentScope;
    // CM owns geometry and input. This owner changes one visibility flag only;
    // a new document must earn focus before inheriting any passive position hint.
    function refresh(): void {
      if (lifetime !== current!.documentScope) { lifetime = current!.documentScope; seen = false; }
      const isolated = current!.element.hasAttribute("data-msfe-input-proxy");
      // Embedded controls own their native caret, including an atomic block's
      // focusable surface. External chrome still keeps the source position hint.
      const active = (view!.dom.getRootNode() as Document | ShadowRoot).activeElement;
      const embedded = active !== view!.contentDOM && !!active && view!.contentDOM.contains(active);
      const visible = seen && !embedded && !disabled.value && (!composing || isolated) && (isolated || windowActive && doc.hasFocus());
      if (current!.element.hasAttribute("data-md-retained-selection") !== visible) {
        current!.element.toggleAttribute("data-md-retained-selection", visible);
      }
    }
    /** Records an actual focus event rather than inferring renewed intent from a state update. */
    function focus(): void { if (!disabled.value && sourceInputHasFocus(view!)) seen = true; refresh(); }
    /** @param event - Native composition boundary; no focus transfer during preedit. */
    function composition(event: Event): void { composing = event.type === "compositionstart"; refresh(); }
    /** @param event - Explicit owner-window activation, independent of editor blur. */
    function windowFocus(event: Event): void { windowActive = event.type === "focus"; refresh(); }
    const stop = watch([scope, disabled, () => state.value && readSourcePresentation(state.value).composing,
      () => { void state.value; return sourceInputHasFocus(view); }], focus, { flush: "sync" });
    view.dom.addEventListener("focusin", focus); view.dom.addEventListener("focusout", refresh);
    view.contentDOM.addEventListener("compositionstart", composition); view.contentDOM.addEventListener("compositionend", composition);
    win.addEventListener("focus", windowFocus); win.addEventListener("blur", windowFocus);
    refresh();
    cleanup(() => {
      stop(); current.element.removeAttribute("data-md-retained-selection");
      view.dom.removeEventListener("focusin", focus); view.dom.removeEventListener("focusout", refresh);
      view.contentDOM.removeEventListener("compositionstart", composition); view.contentDOM.removeEventListener("compositionend", composition);
      win.removeEventListener("focus", windowFocus); win.removeEventListener("blur", windowFocus);
    });
  }, { immediate: true, flush: "sync" });
}
