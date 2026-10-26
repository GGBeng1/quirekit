import { Facet, type EditorState } from "@quirekit/cm-state";
import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { SyntaxNode } from "@lezer/common";
import type { SourceBlock, SourceBlockScopeResolver } from "./types";

/** Optional nested child-flow declarations; document-level blocks work without configuration. */
export const sourceBlockScopes = Facet.define<SourceBlockScopeResolver>();

/** @param state - Canonical source. @param position - Physical line boundary or interior hit. @returns The first syntax character when a block starts with preserved indentation. */
function syntaxPosition(state: EditorState, position: number): number {
  const line = state.doc.lineAt(position);
  return position === line.from ? position + line.text.search(/\S|$/u) : position;
}

/** @param state - Canonical source. @param node - Candidate direct child. @returns Complete line-owned block, or null for inline syntax and delimiters. */
function blockForNode(state: EditorState, node: SyntaxNode): SourceBlock | null {
  const parent = node.parent;
  if (!parent || node.to <= node.from || !syntaxTreeAvailable(state, node.to)) return null;
  // Root metadata and unfinished fences have positional semantics: moving their
  // bytes can turn unrelated neighbors into content, so they are not drag blocks.
  if (node.name === "Frontmatter" || node.name === "FencedCode" && node.getChildren("CodeMark").length !== 2) return null;
  if (state.facet(sourceBlockScopes).some(resolve => resolve(state, node) === false)) return null;
  const line = state.doc.lineAt(node.from), end = state.doc.lineAt(node.to);
  if (state.sliceDoc(line.from, node.from).trim() || state.sliceDoc(node.to, end.to).trim()) return null;
  const scope = parent.type.isTop ? { from: 0, to: state.doc.length }
    : state.facet(sourceBlockScopes).map(resolve => resolve(state, parent)).find(range => range !== null);
  if (!scope || !Number.isInteger(scope.from) || !Number.isInteger(scope.to)
    || scope.from < parent.from || scope.to > parent.to || line.from < scope.from || end.to > scope.to) return null;
  return { from: line.from, to: end.to, name: node.name, scope };
}

/**
 * Resolves only the pointer/caret ancestor chain, without scanning sibling content.
 * @param state - Accepted source and parser snapshot.
 * @param position - Logical position inside a block.
 * @param scope - Optional required sibling flow, used to lift a drop target out of nested content.
 * @returns Nearest complete block in an admitted sibling flow.
 */
export function sourceBlockAt(state: EditorState, position: number, scope?: SourceBlock["scope"]): SourceBlock | null {
  if (!Number.isInteger(position) || position < 0 || position > state.doc.length) return null;
  position = syntaxPosition(state, position);
  let result: SourceBlock | null = null;
  for (const side of [1, -1] as const) {
    // A pointer after the final glyph belongs to the shorter block ending there,
    // not its container. Keep Markdown ownership outside mounted code languages.
    for (let node: SyntaxNode | null = syntaxTree(state).resolve(position, side); node; node = node.parent) {
      if (node.from > position || node.to < position) continue;
      const block = blockForNode(state, node);
      if (block && (!scope || block.scope.from === scope.from && block.scope.to === scope.to)
        && (!result || block.to - block.from < result.to - result.from)) result = block;
    }
  }
  return result;
}

/** @param a - First block. @param b - Second block. @returns Whether both belong to exactly the same source flow. */
export function sameSourceBlockScope(a: SourceBlock, b: SourceBlock): boolean {
  return a.scope.from === b.scope.from && a.scope.to === b.scope.to;
}

/** @param state - Current snapshot. @param block - Previously resolved block. @returns Whether its syntax and complete range still match. */
export function currentSourceBlock(state: EditorState, block: SourceBlock): boolean {
  const current = sourceBlockAt(state, block.from);
  return !!current && current.from === block.from && current.to === block.to
    && current.name === block.name && sameSourceBlockScope(current, block);
}

/** @param state - Accepted parser. @param block - Current complete block. @param direction - Previous or next sibling. @returns Adjacent structural block without enumerating the document. */
export function sourceBlockSibling(state: EditorState, block: SourceBlock, direction: -1 | 1): SourceBlock | null {
  let node: SyntaxNode | null = syntaxTree(state).resolve(syntaxPosition(state, block.from), 1);
  while (node && (blockForNode(state, node)?.to !== block.to)) node = node.parent;
  if (!node) return null;
  const sibling = direction === -1 ? node.prevSibling : node.nextSibling;
  const result = sibling ? blockForNode(state, sibling) : null;
  return result && sameSourceBlockScope(block, result) ? result : null;
}
