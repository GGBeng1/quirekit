import type { QuireEditor } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import type { DataViewOptions } from "./types";
import { openDataView } from "./open";

/** Opens selected data objects before a mounted host's text-mutation guard.
 * @param editor - Document and selection owner.
 * @param dom - Exact mounted view root, never the whole document.
 * @param open - Host workspace factory.
 * @param accepts - Optional exact-occurrence activation policy for inline renderers.
 * @returns Listener cleanup tied to the plugin view lifetime.
 */
export function bindDataViewActivation(editor: QuireEditor, dom: HTMLElement, open: DataViewOptions["open"], accepts?: (position: number) => boolean): () => void {
  /** @param event - Native event within this view. */
  function activate(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.key !== "Enter" || event.isComposing || event.keyCode === 229
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || editor.isDestroyed) return;
    const selection = editor.state.pm.selection;
    if (!(selection instanceof NodeSelection) || selection.node.type.name !== "dataView") return;
    if (accepts && !accepts(selection.from)) return;
    if (openDataView(editor, open, selection.from)) { event.preventDefault(); event.stopPropagation(); }
  }
  dom.addEventListener("keydown", activate, true);
  return () => dom.removeEventListener("keydown", activate, true);
}
