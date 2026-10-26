import { sourceBlockAt, type MsfeEditor } from "@quirekit/msfe-core";
import type { WhiteboardInsertionTarget } from "./types";

/** @param state - Accepted source and parser snapshot. @param position - User's insertion intent.
 * @returns Complete preceding block or leading whitespace; unfinished syntax is refused. */
export function whiteboardInsertionTarget(state: MsfeEditor["state"], position: number): WhiteboardInsertionTarget | null {
  const scope = { from: 0, to: state.doc.length };
  const block = sourceBlockAt(state, position, scope);
  if (block) return { from: block.from, to: block.to, block };
  const line = state.doc.lineAt(position);
  if (line.text.trim()) return null;
  // Blank lines have no syntax node. Resolve their nearest preceding complete
  // document block before capturing a target; never insert into an open fence.
  for (let number = line.number - 1; number >= 1; number--) {
    const previous = state.doc.line(number);
    if (!previous.text.trim()) continue;
    const neighbor = sourceBlockAt(state, previous.to, scope);
    return neighbor && neighbor.to <= line.from ? { from: neighbor.from, to: neighbor.to, block: neighbor } : null;
  }
  return { from: position, to: position, block: null };
}
