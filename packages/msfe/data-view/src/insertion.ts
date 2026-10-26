import { sourceBlockAt, type MsfeEditor, type MsfeSourceRange } from "@quirekit/msfe-core";

/** Finds a complete neighbor for insertion, including blank gaps in Markdown.
 * @param editor - Source owner.
 * @param position - Original caret intent.
 * @returns Anchor range for a complete preceding block, or leading whitespace.
 */
export function dataViewInsertionRange(editor: MsfeEditor, position: number): MsfeSourceRange | null {
  const state = editor.state, scope = {from: 0, to: state.doc.length};
  const direct = sourceBlockAt(state, position, scope);
  if (direct) return {from: direct.from, to: direct.to};
  const line = state.doc.lineAt(position);
  if (line.text.trim()) return null;
  for (let n = line.number - 1; n > 0; n--) {
    const previous = state.doc.line(n); if (!previous.text.trim()) continue;
    const block = sourceBlockAt(state, previous.to, scope);
    return block && block.to <= line.from ? {from: block.from, to: block.to} : null;
  }
  return {from: position, to: position};
}
