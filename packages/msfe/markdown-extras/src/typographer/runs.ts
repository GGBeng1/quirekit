import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { TypographyRun } from "./types";

const inline = /^(?:Emphasis|StrongEmphasis|Strikethrough|Link|Highlight|InsertedText|Subscript|Superscript|InlineFootnote)$/u;

/** @param state - Canonical source. @param node - Confirmed bounded inline block. @returns Plain text gaps; all syntax, code, URLs, images and literal escapes remain owned by their feature. */
export function typographyRuns(state: EditorState, node: SyntaxNode): TypographyRun[] {
  const result: TypographyRun[] = [];
  /** @param current - Existing parser node. @param depth - Semantic inline level. */
  function visit(current: SyntaxNode, depth: number): void {
    let from = current.from;
    for (let child = current.firstChild; child; child = child.nextSibling) {
      if (child.from > from) result.push({ from, text: state.sliceDoc(from, child.from), depth });
      if (inline.test(child.name)) { visit(child, depth + 1); result.push({ from: child.to, text: "", depth }); }
      from = child.to;
    }
    if (from < current.to) result.push({ from, text: state.sliceDoc(from, current.to), depth });
  }
  visit(node, 0); return result;
}
