import type { SyntaxNode, Tree } from "@lezer/common";
import type { EditorState } from "@quirekit/cm-state";
import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { MsfeSourceRange } from "@quirekit/msfe-core";

/** @param tree - Accepted tree. @param position - Source position. @returns The nearest heading containing that position. */
export function headingNode(tree: Tree, position: number): SyntaxNode | null {
  for (let node: SyntaxNode | null = tree.resolveInner(position, 1); node; node = node.parent) {
    if (/^(ATXHeading[1-6]|SetextHeading[12])$/u.test(node.name)) return node;
  }
  return null;
}

/** @param node - Confirmed heading. @returns Whether the next sibling belongs to this section, without scanning its contents. */
export function hasHeadingBody(node: SyntaxNode): boolean {
  const next = node.nextSibling;
  return !!next && next.name !== "ContainerMark"
    && (!/^(ATX|Setext)Heading/u.test(next.name) || Number(next.name.slice(-1)) > Number(node.name.slice(-1)));
}

/** @param state - Canonical source. @param node - Confirmed heading. @returns Last visible title offset, before a Setext underline if present. */
export function headingBodyStart(state: EditorState, node: SyntaxNode): number {
  const underline = node.name.startsWith("Setext") ? node.getChild("HeaderMark") : null;
  return underline ? state.doc.lineAt(underline.from).from - 1 : state.doc.lineAt(node.to).to;
}

/** @param state - Canonical parser state. @param position - Position within a heading. @returns Its complete section, constrained to the enclosing block stream. */
export function headingSection(state: EditorState, position: number): MsfeSourceRange | null {
  const tree = syntaxTree(state), node = headingNode(tree, position);
  if (!node || !hasHeadingBody(node) || !syntaxTreeAvailable(state, state.doc.length) || tree.length < state.doc.length) return null;
  const level = Number(node.name.slice(-1));
  let last = node;
  // Only siblings in this Markdown stream belong to the section. Container fences
  // are syntax boundaries rather than section content, even though they are siblings.
  for (let next = node.nextSibling; next; next = next.nextSibling) {
    if (next.name === "ContainerMark" || /^(ATX|Setext)Heading/u.test(next.name) && Number(next.name.slice(-1)) <= level) break;
    last = next;
  }
  const from = headingBodyStart(state, node);
  return last === node || last.to <= from ? null : { from, to: last.to };
}

/** @param state - Canonical source. @param from - Native fold start. @returns Heading owning exactly this fold start, excluding folds in nested code. */
export function headingAtFold(state: EditorState, from: number): SyntaxNode | null {
  const node = headingNode(syntaxTree(state), Math.max(0, from - 1));
  return node && headingBodyStart(state, node) === from ? node : null;
}
