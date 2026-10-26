import { insertSourceBlock, sourceBlockAt, type Command } from "@quirekit/msfe-core";
import { isolateHistory } from "@quirekit/cm-commands";
import { dataViewMarkdown, type DataViewEmbed } from "@quirekit/data-view";

declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** Canonical data-view source mutation. */
    readonly dataView: {
      /** @param value - Complete source. @param insert - Insert beside a block instead of replacing its fence. @returns Acceptance. */
      commitDataView: (value: DataViewEmbed, insert: boolean) => ReturnType;
    };
  }
}
/** Creates one isolated history event without splitting enclosing Markdown syntax.
 * @param value - Complete source.
 * @param insert - New block insertion.
 * @returns Atomic source command.
 */
export function commitDataView(value: DataViewEmbed, insert: boolean): Command {
  return ({tr, state}) => {
    let fence: string; try { fence = dataViewMarkdown(value); } catch { return false; }
    if (!insert) {
      const {from, to} = state.selection.main, previous = state.sliceDoc(from, to);
      let start = 0, end = 0;
      // Keep unchanged fence boundaries mapped so the mounted table retains its
      // controls and focus. The complete edit still publishes in one history event.
      while (start < previous.length && start < fence.length && previous[start] === fence[start]) start++;
      while (end < previous.length - start && end < fence.length - start && previous[previous.length - 1 - end] === fence[fence.length - 1 - end]) end++;
      return tr.apply({annotations: isolateHistory.of("full"), changes: {from: from + start, to: to - end, insert: fence.slice(start, fence.length - end)}})
        && tr.setSelection(from + fence.length);
    }
    const block = sourceBlockAt(state, state.selection.main.from, {from: 0, to: state.doc.length});
    if (block) {
      const change = insertSourceBlock(block, "after", fence)(state); if (!change) return false;
      tr.apply({annotations: isolateHistory.of("full")}); return tr.apply(change);
    }
    if (state.doc.sliceString(0, state.selection.main.from).trim() || state.doc.lineAt(state.selection.main.from).text.trim()) return false;
    tr.apply({annotations: isolateHistory.of("full")}); return tr.insertText(`\n${fence}\n`);
  };
}
