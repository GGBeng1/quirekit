import { RangeSet, StateField, type EditorState } from "@quirekit/cm-state";
import { BlockWrapper, EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { changedSyntaxRanges, readSourcePresentation, touchesSourceRanges, type MsfeSourceRange } from "@quirekit/msfe-core";
import { buildProseStructure } from "./build";
import type { ProseStructureWork } from "./types";

const work = new WeakMap<EditorState, ProseStructureWork>();
const deferred = new WeakMap<EditorState, readonly MsfeSourceRange[]>();

/** @param state - Accepted or speculative state. @returns Detached actual structural work along its lineage. */
export function getProseStructureWork(state: EditorState): ProseStructureWork {
  return { ...work.get(state) ?? { visitedNodes: 0, wrappers: 0 } };
}

/** @param state - Canonical source and presentation. @returns Complete roles for initial mount or explicit mode changes. */
export function proseStructure(state: EditorState): RangeSet<BlockWrapper> {
  const count = getProseStructureWork(state); work.set(state, count);
  return readSourcePresentation(state).mode === "source" ? RangeSet.empty
    : BlockWrapper.set(buildProseStructure(state, [{ from: 0, to: state.doc.length }], count), true);
}

/** Native persistent wrappers map unchanged blocks; only dirty syntax produces new role values. */
export const proseStructureField = StateField.define({
  create: proseStructure,
  /** @param value - Retained roles. @param transaction - Exact accepted source mapping. @returns Incrementally updated native wrappers. */
  update(value, transaction) {
    const before = transaction.startState, state = transaction.state, count = getProseStructureWork(before);
    work.set(state, count);
    if (readSourcePresentation(before).mode !== readSourcePresentation(state).mode) return proseStructure(state);
    if (readSourcePresentation(state).mode === "source") return value;
    const { changes } = transaction, held = deferred.get(before);
    const parsed = transaction.docChanged || syntaxTree(before) !== syntaxTree(state);
    if (!parsed && !held) return value;
    const dirty = [...held?.map(range => ({ from: changes.mapPos(range.from, -1), to: changes.mapPos(range.to, 1) })) ?? [],
      ...parsed ? changedSyntaxRanges(before, state, changes) : []];
    let result = value.map(changes);
    // Adding or removing a wrapper re-parents the line DOM, which makes the
    // browser commit native preedit early. Hold role changes until IME ends;
    // the transaction that starts composition still applies before preedit exists.
    if (readSourcePresentation(before).composing && readSourcePresentation(state).composing) { deferred.set(state, dirty); return result; }
    // Remove intersecting old owners before adding the accepted complete blocks.
    // RangeSet bounds keep unrelated wrappers and their object identities intact.
    for (const range of dirty) result = result.update({ filterFrom: range.from, filterTo: range.to,
      filter: (from, to) => !touchesSourceRanges({ from, to }, [range]) });
    return result.update({ add: buildProseStructure(state, dirty, count), sort: true });
  },
  /** @param field - Source-owned structure. @returns Direct wrappers before native viewport calculation. */
  provide: field => EditorView.blockWrappers.from(field),
});
