import { EditorSelection, type EditorState, type Transaction, type TransactionSpec } from "@quirekit/cm-state";
import { insertNewlineContinueMarkupCommand } from "@quirekit/cm-lang-markdown";
import { proseInput } from "./paragraph";
import { exitEmptyQuote } from "./quote";

const continueMarkup = insertNewlineContinueMarkupCommand({ nonTightLists: false });

/**
 * Uses Markdown's native nesting/numbering rules, with immediate empty-item/quote exit.
 * @param state - Canonical source draft in either editable Prose presentation.
 * @returns One source transaction, or native fallback outside Markdown contexts.
 */
export function continueDocumentMarkup(state: EditorState): TransactionSpec | null {
  if (!proseInput(state)) return null;
  const quoteExit = exitEmptyQuote(state);
  if (quoteExit) return quoteExit;
  let planned: Transaction | undefined;
  continueMarkup({ state, dispatch: transaction => { planned = transaction; } });
  const transaction = planned;
  if (!transaction) return null;

  // An exited top-level list needs a real paragraph separator. Otherwise typing
  // on the new blank line becomes a lazy continuation of the preceding list.
  // Nested outdents keep the native parent marker and numbering untouched.
  let index = 0;
  const next = transaction.state.changeByRange(range => {
    const original = state.doc.lineAt(state.selection.ranges[index++]!.head);
    const line = transaction.newDoc.lineAt(range.head);
    const emptyItem = /^(?:\s*>)*\s*(?:[-+*]|\d+[.)])(?:\s+(?:\[[ xX]\])?)?\s*$/u.test(original.text);
    if (!emptyItem || !range.empty || !/^[\s>]*$/u.test(line.text) || line.from === 0
      || /^[\s>]*$/u.test(transaction.newDoc.line(line.number - 1).text)) return { range };
    const insert = `\n${line.text}`;
    return { changes: { from: range.head, insert }, range: EditorSelection.cursor(range.head + insert.length) };
  });
  return { changes: transaction.changes.compose(next.changes), selection: next.selection, scrollIntoView: true, userEvent: "input" };
}
