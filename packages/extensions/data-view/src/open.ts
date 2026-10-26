import type { QuireEditor, Range } from "@quirekit/core";
import { captureDataViewTarget } from "./target";
import type { DataViewOptions } from "./types";
const tasks = new WeakMap<QuireEditor, {close(): void}>();

/** Opens a single host task and binds its lifetime to the document.
 * @param editor - Mounted owner.
 * @param open - Injected workspace factory.
 * @param position - Optional existing atom.
 * @param insertion - Explicit insertion range independent of focus.
 * @returns Whether the task opened.
 */
export function openDataView(editor: QuireEditor, open: DataViewOptions["open"], position?: number, insertion?: Range): boolean {
  if (!open || tasks.has(editor)) return false;
  const request = captureDataViewTarget(editor, position, insertion); if (!request) return false;
  /** Closes the workspace when its document owner is destroyed. */
  function destroy(): void { tasks.get(editor)?.close(); }
  /** Releases the target and document lifetime subscription. */
  function release(): void { request!.release(); tasks.delete(editor); editor.off("destroy", destroy); if (!editor.isDestroyed) editor.commands.focus(); }
  tasks.set(editor, {close: release}); editor.on("destroy", destroy);
  try { const handle = open({...request, release}, editor); if (tasks.has(editor)) tasks.set(editor, handle); return true; }
  catch (error) { release(); throw error; }
}
