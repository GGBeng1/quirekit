import { EditorState, type ChangeSpec, type Extension, type Transaction } from "@quirekit/cm-state";
import { compositionField } from "../state/fields";
import { sourceDocument } from "../source/authoring/adapter";
import type { InputRule, PasteRule } from "./definition";

/**
 * Applies source rules inside the native input transaction, retaining selection mapping and one undo event.
 * @param input - Priority-ordered suffix rules.
 * @param paste - Priority-ordered clipboard rules.
 * @returns A bounded transaction filter; no document serialization or nested dispatch.
 */
export function sourceRules(input: readonly InputRule[], paste: readonly PasteRule[]): Extension {
  if (!input.length && !paste.length) return [];
  return EditorState.transactionFilter.of(transaction => {
    if (!transaction.docChanged || transaction.startState.readOnly || transaction.startState.field(compositionField, false)
      || transaction.isUserEvent("input.type.compose") || transaction.newSelection.ranges.length !== 1) return transaction;
    let changes: ChangeSpec[] = [];
    if (transaction.isUserEvent("input.paste")) changes = pasteChanges(transaction, paste);
    else if (transaction.isUserEvent("input.type")) changes = inputChanges(transaction, input);
    return changes.length ? [transaction, { changes, sequential: true }] : transaction;
  });
}

/** @param transaction - Native edit. @param rules - Ordered suffix rules. @returns First applicable transformation. */
function inputChanges(transaction: Transaction, rules: readonly InputRule[]): ChangeSpec[] {
  const head = transaction.newSelection.main.head;
  const from = Math.max(transaction.newDoc.lineAt(head).from, head - 512);
  const text = transaction.newDoc.sliceString(from, head);
  for (const rule of rules) {
    const expression = new RegExp(rule.config.find.source, rule.config.find.flags.replace(/[gy]/gu, ""));
    const match = expression.exec(text);
    if (!match || !match[0] || match.index + match[0].length !== text.length) continue;
    const range = { from: from + match.index, to: head };
    const insert = rule.config.handler({ match, range, document: sourceDocument(transaction.state) });
    if (insert !== null && insert !== match[0]) return [{ ...range, insert }];
  }
  return [];
}

/** @param transaction - Native paste. @param rules - Priority-ordered patterns. @returns Disjoint edits confined to inserted text. */
function pasteChanges(transaction: Transaction, rules: readonly PasteRule[]): ChangeSpec[] {
  const changes: { from: number; to: number; insert: string }[] = [];
  // Oversized clipboard payloads remain exact source. The editing path never scans the existing document.
  transaction.changes.iterChanges((_from, _to, from, to, inserted) => {
    if (inserted.length > 65_536) return;
    const text = inserted.toString();
    for (const rule of rules) {
      const expression = new RegExp(rule.config.find.source, rule.config.find.flags.replace(/[gy]/gu, "") + "g");
      for (const match of text.matchAll(expression)) {
        if (!match[0]) continue;
        const range = { from: from + match.index, to: from + match.index + match[0].length };
        if (range.to > to || changes.some(change => change.from < range.to && range.from < change.to)) continue;
        const insert = rule.config.handler({ match, range, document: sourceDocument(transaction.state) });
        if (insert !== null && insert !== match[0]) changes.push({ ...range, insert });
      }
    }
  });
  return changes.sort((a, b) => a.from - b.from);
}
