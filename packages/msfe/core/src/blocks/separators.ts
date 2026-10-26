import type { EditorState } from "@quirekit/cm-state";
import type { MsfeSourceRange } from "../views/types";

/** @param state - Current source. @param range - Insertion point or blank line being replaced. @param markdown - Exact payload. @param scope - Editable sibling flow. @returns Minimal separators retaining existing neighboring whitespace. */
export function sourceBlockInsertion(state: EditorState, range: MsfeSourceRange, markdown: string, scope: MsfeSourceRange): { insert: string; offset: number } {
  const before = state.sliceDoc(Math.max(0, range.from - 2), range.from), after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + 2));
  const leading = range.from === scope.from ? "" : "\n".repeat(2 - (before.match(/\n*$/u)?.[0].length ?? 0));
  const trailing = range.to === scope.to ? "" : "\n".repeat(2 - (after.match(/^\n*/u)?.[0].length ?? 0));
  return { insert: leading + markdown + trailing, offset: leading.length };
}
