import { v4 as uuidv4 } from "uuid";
import { EditorState, type ChangeSpec, type Extension } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { isolateHistory } from "@quirekit/cm-commands";
import { sourceDocument, sourceNode } from "@quirekit/msfe-core";
import { copyDataView, dataViewMarkdown } from "@quirekit/data-view";
import { readDataViewSource } from "./source";

/**
 * Forks only complete data objects inserted by a paste gesture, within the local data budget.
 * @returns Native transaction filter preserving source selection and a single undo event.
 */
export function dataViewClipboard(): Extension {
  return EditorState.transactionFilter.of(transaction => {
    if (!transaction.docChanged || transaction.startState.readOnly || !transaction.isUserEvent("input.paste")) return transaction;
    const changes: ChangeSpec[] = [];
    // Read only pasted intervals. Existing tables, ordinary typing and selection changes do no work.
    transaction.changes.iterChanges((_from, _to, from, to, inserted) => {
      if (inserted.length > 4 * 1024 * 1024 + 64 || !inserted.toString().includes("quirekit-data-view")) return;
      const state = transaction.state;
      syntaxTree(state).iterate({ from, to,
        /** @param candidate - Parser-confirmed syntax overlapping the pasted interval. */
        enter(candidate) {
          if (candidate.name !== "FencedCode") return;
          if (candidate.from < from || candidate.to > to) return false;
          const attrs = readDataViewSource(sourceDocument(state), sourceNode(candidate.node));
          if (attrs) changes.push({ from: candidate.from, to: candidate.to,
            insert: dataViewMarkdown(copyDataView(attrs.dataView, uuidv4())) });
          return false;
        }
      });
    });
    // Rewrite identities inside the same native transaction so undo restores exact pre-paste source.
    return changes.length ? [transaction, { changes, sequential: true, annotations: isolateHistory.of("full") }] : transaction;
  });
}
