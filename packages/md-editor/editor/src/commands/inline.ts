import { EditorSelection } from "@quirekit/cm-state";
import { querySourceInline, type MsfeCommand } from "@quirekit/msfe-core";
import { selectedNode } from "./context";

/** @returns Source code-span toggling with a fence longer than any backtick run in the content. */
export function toggleMdInlineCode(): MsfeCommand {
  return state => {
    if (state.selection.ranges.length !== 1) return null;
    const range = state.selection.main, node = selectedNode(state, ["InlineCode"]);
    if (node) {
      const marks = node.getChildren("CodeMark"), first = marks[0], last = marks.at(-1);
      if (!first || !last) return null;
      let body = state.sliceDoc(first.to, last.from).replace(/\n/gu, " ");
      if (/^ .* $/u.test(body) && /\S/u.test(body)) body = body.slice(1, -1);
      return { changes: { from: node.from, to: node.to, insert: body }, selection: EditorSelection.range(node.from, node.from + body.length) };
    }
    if (querySourceInline(state, range).reason) return null;
    const body = state.sliceDoc(range.from, range.to);
    if (body.includes("\n")) return null;
    const size = Math.max(0, ...Array.from(body.matchAll(/`+/gu), match => match[0].length)) + 1;
    const fence = "`".repeat(size), pad = /^`|`$/u.test(body) || /^ .* $/u.test(body) && /\S/u.test(body) ? " " : "";
    const insert = fence + pad + body + pad + fence, from = range.from + size + pad.length;
    return { changes: { from: range.from, to: range.to, insert }, selection: EditorSelection.range(from, from + body.length) };
  };
}
