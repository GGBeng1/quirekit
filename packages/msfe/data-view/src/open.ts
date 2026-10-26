import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import type { DataViewEmbed } from "@quirekit/data-view";
import type { MsfeDataViewOptions } from "./types";
import { captureMsfeDataViewTarget } from "./target";
const active = new WeakSet<MsfeEditor>();

/** Opens at most one workspace per source editor.
 * @param editor - Source owner.
 * @param open - Host workspace.
 * @param range - Existing fence or insertion intent.
 * @param value - Existing envelope, if any.
 * @returns Whether an isolated task opened.
 */
export function openMsfeDataView(editor: MsfeEditor, open: MsfeDataViewOptions["open"], range: MsfeSourceRange = editor.state.selection.main, value?: DataViewEmbed): boolean {
  if (!open || active.has(editor)) return false;
  const request = captureMsfeDataViewTarget(editor, range, value); if (!request) return false;
  active.add(editor);
  const scope = editor.documentScope;
  let cleanup: (() => void) | undefined, released = false;
  /** Cancels subscriptions and restores source focus. */
  function release(): void {
    if (released) return;
    released = true; request!.release(); active.delete(editor); cleanup?.();
    if (!scope.disposed && !editor.scope.disposed) editor.focus();
  }
  try {
    const handle = open({...request, release}, editor);
    if (!released) cleanup = scope.own(() => { handle.close(); release(); });
    return true;
  }
  catch (failure) { release(); throw failure; }
}
