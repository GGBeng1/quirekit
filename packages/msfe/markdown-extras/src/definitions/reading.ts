import { RangeSet, StateField, type EditorState, type Range } from "@quirekit/cm-state";
import { BlockWrapper, EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { readSourcePresentation } from "@quirekit/msfe-core";

/** @param state - Canonical syntax and mode. @returns Native definition relationships around existing CM lines. */
function definitions(state: EditorState) {
  if (readSourcePresentation(state).mode !== "locked") return RangeSet.empty;
  const ranges: Range<BlockWrapper>[] = [];
  syntaxTree(state).iterate({ enter(reference) {
    const tagName = reference.name === "DefinitionList" ? "dl" : reference.name === "DefinitionTerm" ? "dt"
      : reference.name === "DefinitionDescription" ? "dd" : undefined;
    if (tagName) ranges.push(BlockWrapper.create({ tagName, attributes: { class: "msfe-definition-reading" } })
      .range(state.doc.lineAt(reference.from).from, reference.to));
  } });
  return BlockWrapper.set(ranges, true);
}

/** Immutable source/tree/mode cache; caret changes do not rebuild document relationships. */
export const definitionReading = StateField.define({ create: definitions,
  /** @param value - Existing relationships. @param transaction - Accepted state. @returns Wrappers rebuilt only when a declared dependency changes. */
  update(value, transaction) {
    return transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)
      || readSourcePresentation(transaction.startState).mode !== readSourcePresentation(transaction.state).mode ? definitions(transaction.state) : value;
  },
  /** @param field - Native view relationship owner. @returns Canonical CM wrapper input. */
  provide: field => EditorView.blockWrappers.from(field),
});
