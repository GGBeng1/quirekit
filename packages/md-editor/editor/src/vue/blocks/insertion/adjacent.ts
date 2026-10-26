import { sourceBlockAt, type MsfeEditor, type MsfeTarget } from "@quirekit/msfe-core";
import type { MdAdjacentInsertion } from "./types";

/** @param editor - Source owner. @param target - Intent captured when opening the menu. @returns A complete table/code block retained until the menu closes, or null for unsupported positions. */
export function captureAdjacentInsertion(editor: MsfeEditor, target: MsfeTarget | undefined): MdAdjacentInsertion | null {
  if (!target || editor.state.selection.ranges.length !== 1 || target.selection.ranges.length !== 1 || !editor.can(() => ({}), target)) return null;
  const range = target.selection.main, block = sourceBlockAt(editor.state, range.from);
  if (!block || range.to > block.to || !["Table", "FencedCode", "CodeBlock"].includes(block.name)) return null;
  const anchor = editor.captureAnchor(block), lifetime = editor.documentScope;
  let released = false;
  return {
    name: block.name,
    /** @param side - Chosen sibling boundary. @returns The mapped complete original block; never a newly selected block. */
    target(side) {
      const mapped = anchor.getRange(), captured = anchor.target();
      if (released || lifetime.disposed || !mapped || !captured || !editor.can(() => ({}), captured)) return null;
      const current = sourceBlockAt(editor.state, mapped.from);
      if (!current || current.name !== block.name || current.from !== mapped.from || current.to !== mapped.to) return null;
      return { controls: { editor, block: current, target: captured }, side };
    },
    /** Release on menu dismissal without changing source or selection. */
    release() { if (!released) { released = true; anchor.release(); } },
  };
}
