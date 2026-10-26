import { syntaxTree } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";

/** @param state - Command draft. @param names - Admitted syntax owners. @returns One selected containing node, without scanning the document. */
export function selectedNode(state: EditorState, names: readonly string[]): SyntaxNode | null {
  if (state.selection.ranges.length !== 1) return null;
  const { from, to } = state.selection.main;
  for (const side of [-1, 1] as const) {
    let node: SyntaxNode | null = syntaxTree(state).resolveInner(from, side);
    while (node) {
      if (names.includes(node.name) && node.from <= from && node.to >= to) return node;
      node = node.parent;
    }
  }
  return null;
}
