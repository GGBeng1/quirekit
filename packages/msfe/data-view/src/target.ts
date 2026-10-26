import { v4 as uuidv4 } from "uuid";
import { dataViewInsertionRange } from "./insertion";
import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { createDataView, readDataView, serializeDataView, type DataViewEditRequest, type DataViewEmbed } from "@quirekit/data-view";
import "./commands";

/** Captures source proof before opening any asynchronous workspace.
 * @param editor - Source owner.
 * @param range - Requested fence or insertion location.
 * @param existing - Existing source when editing.
 * @returns Conditional source task or refusal.
 */
export function captureMsfeDataViewTarget(editor: MsfeEditor, range: MsfeSourceRange, existing?: DataViewEmbed): DataViewEditRequest | null {
  if (editor.scope.disposed || editor.state.readOnly || editor.mode === "locked") return null;
  const value = existing ? readDataView(existing) : createDataView(uuidv4());
  if (existing) {
    const match = editor.querySource("dataView", range).matches.find(item => item.from === range.from && item.to === range.to);
    if (!match || serializeDataView(match.attrs.dataView as DataViewEmbed) !== serializeDataView(value)) return null;
  } else {
    const insertion = dataViewInsertionRange(editor, range.from);
    if (!insertion) return null; range = insertion;
  }
  const anchor = editor.captureAnchor(range), scope = editor.documentScope, base = serializeDataView(value);
  let closed = false, saved = false;
  return {value,
    /** @param save - Complete draft and source precondition. @returns Source acceptance. */
    commit(save) {
      if (closed || saved || scope.disposed || !anchor.target()) return {accepted: false, message: "原围栏已变化或删除，请重新打开。"};
      if (editor.state.readOnly || editor.mode === "locked") return {accepted: false, message: "文档已切换为只读。"};
      if (save.base !== base || save.value.id !== value.id) return {accepted: false, message: "草稿身份不匹配。"};
      saved = editor.chain(anchor.target()!).commitDataView(save.value, !existing).run();
      return {accepted: saved, ...(!saved ? {message: "源码位置已失效。"} : {})};
    },
    /** Releases the mapped anchor. */ release() { if (closed) return; closed = true; anchor.release(); }
  };
}
