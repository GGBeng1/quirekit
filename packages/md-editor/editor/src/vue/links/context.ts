import { shallowRef, watch } from "vue";
import { syntaxTree } from "@quirekit/cm-language";
import { EditorView } from "@quirekit/cm-view";
import { isSafeDestination, readSourceDestination, readSourcePresentation, sourceDocument, sourceNode, type MsfeEditor } from "@quirekit/msfe-core";
import type { MdLinkContext } from "./types";

/**
 * Activates only clicked Markdown links; idle typing and selection do no source or geometry work.
 * @param editor - Mounted source owner.
 * @param enabled - Whether another product task owns interaction.
 * @returns Current source intent and synchronous disposal.
 */
export function useMdLinkContext(editor: () => MsfeEditor, enabled: () => boolean) {
  const current = shallowRef<MdLinkContext | null>(null);
  let unsubscribe: (() => void) | undefined;

  /** Releases source ownership and the open-only state subscription. */
  function close(): void {
    unsubscribe?.(); unsubscribe = undefined;
    current.value?.anchor.release(); current.value = null;
  }

  watch([editor, enabled], ([owner, active], _previous, cleanup) => {
    close();
    if (!active) return;
    const element = owner.element, win = element.ownerDocument.defaultView!;
    /** @param event - Completed pointer activation, after the editor has positioned the caret. */
    function click(event: MouseEvent): void {
      close();
      if (owner.mode !== "live" || event.button !== 0 || event.detail > 1 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const view = EditorView.findFromDOM(element), selection = owner.state.selection;
      if (!view || view.composing || readSourcePresentation(view.state).composing || selection.ranges.length !== 1 || !selection.main.empty) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-msfe-url]:not([data-msfe-text-link])") : null;
      if (!link || !element.contains(link)) return;
      // Resolve only the hit's ancestor chain. The outer Link/Autolink owns nested URL tokens.
      const position = view.posAtDOM(link), tree = syntaxTree(owner.state);
      let node = tree.resolveInner(position, 1), candidate = null;
      for (;;) {
        if (node.name === "Link" || node.name === "Autolink") { candidate = node; break; }
        if (node.name === "URL") candidate = node;
        if (node.name === "Image" || node.name === "LinkReference") return;
        if (!node.parent) break;
        node = node.parent;
      }
      if (!candidate) return;
      const destination = readSourceDestination(sourceDocument(owner.state), sourceNode(candidate));
      if (!destination || !isSafeDestination(destination.url) || destination.url !== link.dataset.msfeUrl) return;
      const rect = link.getBoundingClientRect();
      current.value = { anchor: owner.captureAnchor(candidate), url: destination.url, position: { left: `${rect.left}px`, top: `${rect.bottom}px` } };
      // Only source, selection and interaction ownership invalidate the task.
      // Parser/measurement effects must not dismiss a card immediately after activation.
      unsubscribe = owner.subscribeState({
        select: state => {
          const presentation = readSourcePresentation(state);
          return [state.doc, state.selection, state.readOnly, presentation.mode, presentation.composing, owner.documentScope] as const;
        },
        equal: (before, after) => before.every((value, index) => value === after[index]),
        change: close,
      });
    }
    element.addEventListener("click", click);
    win.addEventListener("scroll", close, { capture: true, passive: true });
    win.addEventListener("resize", close);
    cleanup(() => {
      element.removeEventListener("click", click);
      win.removeEventListener("scroll", close, true); win.removeEventListener("resize", close); close();
    });
  }, { immediate: true, flush: "sync" });
  return { current, close };
}
