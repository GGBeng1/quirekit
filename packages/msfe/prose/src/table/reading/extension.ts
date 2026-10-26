import { RangeSet, StateField, type EditorState, type Range } from "@quirekit/cm-state";
import { BlockWrapper, EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { readSourcePresentation } from "@quirekit/msfe-core";
import { tableReadingModel } from "./model";

/**
 * Wraps existing CM rows so virtualized table fragments retain their real semantic parent.
 * @param state - Canonical source and presentation mode.
 * @returns Native wrappers, without duplicated text, DOM reparenting or another input owner.
 */
function build(state: EditorState) {
  if (readSourcePresentation(state).mode !== "locked") return RangeSet.empty;
  const ranges: Range<BlockWrapper>[] = [];
  syntaxTree(state).iterate({ enter(reference) {
    if (reference.name !== "Table") return;
    const model = tableReadingModel(state, reference.node);
    ranges.push(BlockWrapper.create({ tagName: "div", attributes: {
      class: "msfe-table-reading", role: "table", "aria-label": state.phrase("Markdown table"),
      "aria-rowcount": String(model.rows.length), "aria-colcount": String(model.columns),
    } }).range(state.doc.lineAt(reference.from).from, reference.to));
    return false;
  } });
  return BlockWrapper.set(ranges, true);
}

/** Tree/mode-dependent reading relationships; selection and viewport changes reuse CM wrappers. */
export const tableReading = StateField.define({ create: build,
  /** @param value - Retained native wrappers. @param transaction - Accepted CM state change. @returns Updated relationships only when source/tree/mode changes. */
  update(value, transaction) {
    return transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
      || readSourcePresentation(transaction.startState).mode !== readSourcePresentation(transaction.state).mode ? build(transaction.state) : value;
  },
  /** @param field - Canonical relationship owner. @returns Native CM wrapper configuration. */
  provide: field => EditorView.blockWrappers.from(field),
});
