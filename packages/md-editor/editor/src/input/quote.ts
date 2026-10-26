import { EditorSelection, type EditorState, type TransactionSpec } from "@quirekit/cm-state";
import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";

/**
 * Resolves only the innermost confirmed empty quote marker on the caret's line.
 * @param state - Accepted source and syntax.
 * @param position - Empty selection endpoint.
 * @returns The marker start, excluding outer quote/list prefixes, or no admitted exit.
 */
function emptyQuoteStart(state: EditorState, position: number): number | null {
  const line = state.doc.lineAt(position);
  if (!syntaxTreeAvailable(state, line.to)) return null;
  let owner = syntaxTree(state).resolveInner(position, -1);
  if (owner.name === "QuoteMark") owner = owner.parent!;
  if (owner.name !== "Blockquote") return null;
  const mark = owner.childBefore(line.to);
  return mark?.name === "QuoteMark" && mark.from >= line.from && position >= mark.to
    && !state.sliceDoc(mark.to, line.to).trim() ? mark.from : null;
}

/**
 * Exits one empty quote level without waiting for a second empty quoted row.
 * @param state - Editable Prose state already admitted by the shared input guard.
 * @returns One atomic source edit for compatible carets, or native continuation.
 */
export function exitEmptyQuote(state: EditorState): TransactionSpec | null {
  const starts = state.selection.ranges.map(range => range.empty ? emptyQuoteStart(state, range.head) : null);
  if (starts.some(from => from === null)) return null;
  let index = 0;
  const changes = state.changeByRange(range => {
    const from = starts[index++]!, line = state.doc.lineAt(range.head), prefix = state.sliceDoc(line.from, from);
    // A semantic exit needs both a separator and an editable row. Reuse the
    // adjacent outer-flow blank when present; do not grow every existing gap.
    const needsSeparator = line.number > 1 && /^[\t >]*$/u.test(prefix)
      && !/^[\t >]*$/u.test(state.doc.line(line.number - 1).text);
    const next = line.number < state.doc.lines ? state.doc.line(line.number + 1) : null;
    const reuseNext = needsSeparator && next?.text === prefix;
    const insert = needsSeparator ? `\n${prefix}` : "";
    // Include a reused row in the replacement so native history maps the old
    // marker caret to the editable row on redo, not to its collapsed separator.
    const to = reuseNext ? next!.to : line.to;
    return { changes: { from, to, insert }, range: EditorSelection.cursor(from + insert.length) };
  });
  return { ...changes, scrollIntoView: true, userEvent: "input" };
}
