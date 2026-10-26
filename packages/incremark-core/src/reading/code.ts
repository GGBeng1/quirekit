import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";

/** @param state - Source snapshot. @param node - Confirmed code node. @returns Code body with container prefixes excluded by the canonical parse. */
export function readCodeBody(state: EditorState, node: SyntaxNode): string {
  return node.getChildren("CodeText").map(child => state.sliceDoc(child.from, child.to)).join("\n");
}
