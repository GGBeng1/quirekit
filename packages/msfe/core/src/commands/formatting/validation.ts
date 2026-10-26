import { ensureSyntaxTree } from "@quirekit/cm-language";
import type { ChangeSet, EditorState, SelectionRange } from "@quirekit/cm-state";
import type { SourceMarkFormat, SourceMarkSpan } from "./types";
import { inlineSpans, querySourceInline } from "./context";

/**
 * Proves the intended mark and all previous paired semantics using the installed grammar.
 * @param state - Original accepted source.
 * @param changes - Proposed local source edits.
 * @param range - Mapped selection inside the intended format.
 * @param spans - Previous inline semantics in the bounded owner.
 * @param format - Feature's declared grammar.
 * @param removed - The one existing mark intentionally removed, if any.
 * @returns Whether the atomic plan preserves the semantic contract within the parse budget.
 */
export function validMarkChange(state: EditorState, changes: ChangeSet, range: SelectionRange, spans: readonly SourceMarkSpan[], format: SourceMarkFormat, removed?: SourceMarkSpan): boolean {
  const next = state.update({ changes, selection: range, filter: false }).state;
  const end = spans.reduce((to, span) => Math.max(to, changes.mapPos(span.node.to, 1)), range.to);
  if (!ensureSyntaxTree(next, Math.min(next.doc.length, end + 1), 12)) return false;
  const owner = querySourceInline(next, range).node;
  if (!owner) return false;
  const after = inlineSpans(owner);
  // A successful text insertion is insufficient: punctuation can turn surrounding
  // delimiters into literal text. Both old and requested semantics must survive.
  if (!removed && !after.some(span => span.node.name === format.node && span.from <= range.from && span.to >= range.to)) return false;
  return spans.every(span => span === removed || after.some(candidate => candidate.node.name === span.node.name
    && candidate.from <= changes.mapPos(span.from, 1) && candidate.to >= changes.mapPos(span.to, -1)));
}
