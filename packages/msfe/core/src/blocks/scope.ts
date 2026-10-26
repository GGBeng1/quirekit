import type { ChangeSet, EditorState } from "@quirekit/cm-state";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import type { SyntaxNode } from "@lezer/common";
import { sourceBlockScopes } from "./query";
import type { SourceBlock } from "./types";

/**
 * Checks a nested flow only when committing an explicit command, never during pointer movement.
 * Delimiters inside inserted Markdown must not prematurely terminate the owning container.
 * @param state - Accepted source snapshot.
 * @param changes - Complete proposed atomic operation.
 * @param block - Original flow owner.
 * @returns Whether the same enclosing child flow survives, or false if bounded parsing cannot prove it.
 */
export function preservesSourceBlockScope(state: EditorState, changes: ChangeSet, block: Pick<SourceBlock, "scope">): boolean {
  if (block.scope.from === 0 && block.scope.to === state.doc.length) return true;
  const next = state.update({ changes }).state;
  const from = changes.mapPos(block.scope.from, -1), to = changes.mapPos(block.scope.to, 1);
  const tree = ensureSyntaxTree(next, Math.min(next.doc.length, to + 1), 8);
  if (!tree) return false;
  for (let node: SyntaxNode | null = tree.resolveInner(from, 1); node; node = node.parent) {
    for (const resolve of next.facet(sourceBlockScopes)) {
      const scope = resolve(next, node);
      if (scope && scope.from === from && scope.to === to) return true;
    }
  }
  return false;
}
