import { syntaxTree, syntaxTreeAvailable } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { SourceInlineQuery, SourceMarkSpan } from "./types";
import { sourceBlankLineAt } from "../../blocks/insertion";

/** @param node - Confirmed inline node. @returns Its paired syntax shell, when present. */
export function markSpan(node: SyntaxNode): SourceMarkSpan | null {
  const first = node.firstChild, last = node.lastChild;
  return first && last && first.from !== last.from && first.name === last.name && first.name.endsWith("Mark")
    ? { node, from: first.to, to: last.from } : null;
}

/**
 * Reads only source endpoints and their ancestors; never starts parsing or serializes the document.
 * @param state - Accepted source state.
 * @param range - One intended inline range.
 * @returns A common inline owner or a structural refusal.
 */
export function querySourceInline(state: EditorState, range: { readonly from: number; readonly to: number }): SourceInlineQuery {
  if (state.readOnly) return { node: null, reason: "readonly" };
  if (!syntaxTreeAvailable(state, range.to)) return { node: null, reason: "unparsed" };
  if (range.from === range.to && sourceBlankLineAt(state, range.from)) return { node: null, reason: null };
  const tree = syntaxTree(state), owners: SyntaxNode[] = [];
  for (const position of [range.from, range.to]) {
    let owner: SyntaxNode | null = null;
    let endpoint = tree.resolve(position, position === range.from ? 1 : -1);
    // At an insertion point just after a paragraph, right bias sees the gap.
    // Recover its left owner; the outer edge of a literal is still prose.
    if (range.from === range.to && endpoint.type.isTop) endpoint = tree.resolve(position, -1);
    for (let node: SyntaxNode | null = endpoint; node; node = node.parent) {
      if (["HeaderMark", "ListMark", "QuoteMark", "TableDelimiter"].includes(node.name)) return { node: null, reason: "structure" };
      if (["InlineCode", "InlineMath", "URL", "LinkTitle", "HTMLTag"].includes(node.name)
        && !(range.from === range.to && (position === node.from || position === node.to))
        && !(range.from <= node.from && range.to >= node.to && range.from !== range.to)) return { node: null, reason: "literal" };
      if (/^(?:Paragraph|TableCell|ATXHeading[1-6]|SetextHeading[12])$/u.test(node.name)) { owner = node; break; }
    }
    if (!owner) return { node: null, reason: "structure" };
    owners.push(owner);
  }
  const first = owners[0]!, last = owners[1]!;
  if (first.from !== last.from || first.to !== last.to || first.name !== last.name) return { node: null, reason: "selection" };
  return { node: first, reason: null };
}

/** @param owner - Bounded inline container. @returns Its paired inline descendants, in source order. */
export function inlineSpans(owner: SyntaxNode): SourceMarkSpan[] {
  const spans: SourceMarkSpan[] = [], cursor = owner.cursor();
  do { const span = markSpan(cursor.node); if (span) spans.push(span); } while (cursor.next());
  return spans;
}
