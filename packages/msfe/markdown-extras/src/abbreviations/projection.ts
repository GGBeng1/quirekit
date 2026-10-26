import { Decoration } from "@quirekit/cm-view";
import type { Range } from "@quirekit/cm-state";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import { queryAbbreviations } from "./query";

/** @param input - One confirmed visible inline block. @returns Native abbreviation marks over plain text, excluding code, URLs and raw HTML. */
export function projectAbbreviations({ state, node, from, to }: { state: EditorState; node: SyntaxNode; from: number; to: number }): Range<Decoration>[] {
  const index = queryAbbreviations(state), result: Range<Decoration>[] = [];
  if (!index.pattern) return result;
  const pattern = new RegExp(index.pattern, "gu");
  /** @param start - Plain text start. @param end - Plain text end. */
  function text(start: number, end: number): void {
    start = Math.max(start, from); end = Math.min(end, to);
    if (end <= start) return;
    const value = state.sliceDoc(start, end); pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      const left = start + match.index, right = left + match[0].length;
      if (/[\p{L}\p{N}_]/u.test(state.sliceDoc(Math.max(node.from, left - 1), left)) || /[\p{L}\p{N}_]/u.test(state.sliceDoc(right, Math.min(node.to, right + 1)))) continue;
      result.push(Decoration.mark({ tagName: "abbr", class: "msfe-abbreviation qk-prose-node", attributes: { title: index.definitions.get(match[0])! } }).range(left, right));
    }
  }
  /** @param current - Existing inline tree; no second AST is built. */
  function visit(current: SyntaxNode): void {
    if (current.to <= from || current.from >= to) return;
    if (/^(?:InlineCode|Autolink|URL|LinkTitle|HTMLTag|HTMLBlock|Image|InlineMath|Emoji)$/u.test(current.name)) return;
    let position = current.from;
    for (let child = current.firstChild; child; child = child.nextSibling) {
      text(position, child.from); position = child.to;
      if (!/Mark$|^(?:Escape|Entity|LinkLabel)$/u.test(child.name)) visit(child);
    }
    text(position, current.to);
  }
  visit(node); return result;
}
