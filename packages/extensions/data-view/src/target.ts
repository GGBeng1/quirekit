import { v4 as uuidv4 } from "uuid";
import type { QuireEditor, Range } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import { createDataView, readDataView, serializeDataView, type DataViewEditRequest } from "@quirekit/data-view";
import "./commands";

/** Captures a mapped target whose exact source must still match on application.
 * @param editor - Document owner.
 * @param position - Existing atom, or current selection when omitted.
 * @param insertion - Explicit insertion range independent of focus.
 * @returns Disposable conditional target, or refusal.
 */
export function captureDataViewTarget(editor: QuireEditor, position?: number, insertion?: Range): DataViewEditRequest | null {
  if (editor.isDestroyed || !editor.isEditable || !editor.state.pm.schema.nodes.dataView) return null;
  if (insertion && (position !== undefined || !Number.isInteger(insertion.from) || !Number.isInteger(insertion.to) || insertion.from < 0 || insertion.to < insertion.from || insertion.to > editor.state.doc.content.size)) return null;
  const state = editor.state.pm, original = position === undefined ? null : state.doc.nodeAt(position);
  if (position !== undefined && original?.type.name !== "dataView") return null;
  let value;
  try { value = original ? readDataView(original.attrs.dataView) : createDataView(uuidv4()); } catch { return null; }
  const base = serializeDataView(value);
  let start = position ?? insertion?.from ?? state.selection.from, end = position === undefined ? insertion?.to ?? state.selection.to : position + 1;
  const selected = state.doc.slice(start, end).content;
  let released = false, invalidated = false, saved = false;
  /** Reprojects the target through all accepted document transactions.
   * @param event - Main and appended transactions.
   */
  function track(event: {transaction: Transaction; appendedTransactions?: readonly Transaction[]}): void {
    for (const transaction of [event.transaction, ...(event.appendedTransactions ?? [])]) {
      if (!transaction.docChanged) continue;
      const left = transaction.mapping.mapResult(start, 1), right = transaction.mapping.mapResult(end, -1);
      if ((insertion && (left.deleted || right.deleted)) || left.deletedAcross || right.deletedAcross || (position !== undefined && left.deleted && transaction.doc.nodeAt(left.pos)?.type.name !== "dataView")) invalidated = true;
      start = left.pos; end = Math.max(start, right.pos);
    }
  }
  editor.on("transaction", track);
  return {value,
    /** @param save - Source precondition and complete proposed embed. @returns Host acceptance. */
    commit(save) {
      if (released || invalidated || saved || editor.isDestroyed) return {accepted: false, message: "原数据块已失效，请关闭后重开。"};
      if (!editor.isEditable) return {accepted: false, message: "文档已切换为只读。"};
      if (save.base !== base || save.value.id !== value.id) return {accepted: false, message: "草稿不属于当前数据块。"};
      if (position === undefined) {
        if (end > editor.state.pm.doc.content.size || !editor.state.pm.doc.slice(start, end).content.eq(selected)) return {accepted: false, message: "插入位置的内容已变化。"};
        saved = editor.commands.insertDataView({value: save.value, from: start, to: end});
      } else saved = editor.commands.replaceDataView({position: start, expected: base, value: save.value});
      return {accepted: saved, ...(!saved ? {message: "数据块已变化，未覆盖原内容。"} : {})};
    },
    /** Releases the document subscription. */
    release() { if (released) return; released = true; editor.off("transaction", track); }
  };
}
