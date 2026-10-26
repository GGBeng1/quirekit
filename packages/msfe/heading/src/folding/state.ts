import { EditorState, Prec, StateField, type StateEffect } from "@quirekit/cm-state";
import { foldService, foldedRanges, syntaxTree, unfoldEffect } from "@quirekit/cm-language";
import { readSourcePresentation, type StateSlot } from "@quirekit/msfe-core";
import { headingAtFold, headingSection } from "./query";
import type { HeadingFoldSnapshot } from "./types";

const snapshot = StateField.define<HeadingFoldSnapshot>({
  create: state => ({ state, folds: foldedRanges(state) }),
  /** @param value - Previous dependency. @param transaction - Source/view transaction. @returns Stable identity for unrelated caret movement. */
  update(value, transaction) {
    const state = transaction.state, folds = foldedRanges(state);
    return state.doc === value.state.doc && syntaxTree(state) === syntaxTree(value.state) && folds === value.folds
      ? value : { state, folds };
  },
});

/** Native folding dependency; this slot owns no second set of folded ranges. */
export const headingFoldSnapshot: StateSlot<HeadingFoldSnapshot> = {
  key: "heading-folds", extension: snapshot, read: state => state.field(snapshot),
};

/** Shared boundary validation for source gutters, shortcuts and rich-text controls. */
export const headingFoldSupport = [Prec.high(foldService.of((state, start, end) => headingSection(state, Math.max(start, end - 1)))),
  EditorState.transactionExtender.of(transaction => {
    const before = transaction.startState, state = transaction.state;
    const syntaxChanged = transaction.docChanged || syntaxTree(before) !== syntaxTree(state);
    const presentation = readSourcePresentation(state);
    const reveal = !!transaction.selection && !presentation.selecting && !presentation.composing;
    if (!syntaxChanged && !reveal || !foldedRanges(before).size) return null;
    const effects: StateEffect<unknown>[] = [];
    // Validate only already-folded headings. Ordinary editing with no collapsed
    // sections never builds or walks a document-wide heading index.
    foldedRanges(before).between(0, before.doc.length, (from, to) => {
      const owner = headingAtFold(before, from);
      if (!owner) return;
      const mapped = { from: transaction.changes.mapPos(from, 1), to: transaction.changes.mapPos(to, -1) };
      const range = syntaxChanged ? headingSection(state, transaction.changes.mapPos(owner.from, 1)) : mapped;
      const stale = !range || range.from !== mapped.from || range.to !== mapped.to;
      const selected = reveal && state.selection.ranges.some(item => [item.anchor, item.head].some(position => position > mapped.from && position < mapped.to));
      if (stale || selected) effects.push(unfoldEffect.of(mapped));
    });
    return effects.length ? { effects } : null;
  }),
];
