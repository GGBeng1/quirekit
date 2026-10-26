import { RangeSet, StateField, type EditorState, type Range } from "@quirekit/cm-state";
import { BlockWrapper, EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { readSourcePresentation } from "@quirekit/msfe-core";

/** @param state - Canonical tree and mode. @returns One semantic heading around all native source lines, including multi-line Setext titles. */
function headings(state: EditorState) {
  if (readSourcePresentation(state).mode !== "locked") return RangeSet.empty;
  const ranges: Range<BlockWrapper>[] = [];
  syntaxTree(state).iterate({ enter(reference) {
    if (!/^(?:ATXHeading[1-6]|SetextHeading[12])$/u.test(reference.name)) return;
    ranges.push(BlockWrapper.create({ tagName: "div", attributes: { role: "heading", "aria-level": reference.name.slice(-1) } })
      .range(state.doc.lineAt(reference.from).from, reference.to));
    return false;
  } });
  return BlockWrapper.set(ranges, true);
}

/** Reading relationships depend on source/tree/mode, never caret movement. */
export const headingReading = StateField.define({ create: headings,
  /** @param value - Retained wrappers. @param transaction - Accepted state. @returns Updated relationships only for relevant dependencies. */
  update(value, transaction) {
    return transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
      || readSourcePresentation(transaction.startState).mode !== readSourcePresentation(transaction.state).mode ? headings(transaction.state) : value;
  },
  /** @param field - Native CM wrapper owner. @returns Accessible relationships without duplicated text. */
  provide: field => EditorView.blockWrappers.from(field),
});
