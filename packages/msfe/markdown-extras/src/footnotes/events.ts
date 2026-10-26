import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { navigateFootnote } from "./navigation";

/** @param editor - Late canonical owner. @returns Modified-click and keyboard link activation, preserving ordinary source clicks and drags. */
export function footnoteEvents(editor: () => MsfeEditor) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const marker = (event.target as Element).closest<HTMLElement>("[data-msfe-footnote]");
      if (!marker || event.button !== 0 || (!event.metaKey && !event.ctrlKey)) return false;
      return navigateFootnote(editor(), marker.dataset.msfeFootnote === "reference" ? "definition" : "reference", view.posAtDOM(marker));
    },
    keydown(event, view) {
      const marker = (event.target as Element).closest<HTMLElement>("[data-msfe-footnote]");
      return !!marker && event.key === "Enter" && navigateFootnote(editor(), marker.dataset.msfeFootnote === "reference" ? "definition" : "reference", view.posAtDOM(marker));
    },
  });
}
