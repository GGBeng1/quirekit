import { syntaxTree } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { MsfeSourceRange } from "@quirekit/msfe-core";

/**
 * Groups editable Markdown by paragraph, list item, quote and table cell.
 * @param state - Canonical source tree; selection itself is never expanded.
 * @param range - Confirmed projected fragment or normalization owner.
 * @returns Its nearest semantic reveal owner, retaining independent nested lists/cells.
 */
export function markdownRevealOwner(state: EditorState, range: MsfeSourceRange): MsfeSourceRange {
  let owner = range;
  // Walk only this fragment's ancestor path. No source serialization or sibling
  // traversal is needed when the caret moves inside a long document.
  for (let node: SyntaxNode | null = syntaxTree(state).resolveInner(range.from, 1); node; node = node.parent) {
    if (node.from > range.from || node.to < range.to) continue;
    if (["TableCell", "ListItem", "Blockquote"].includes(node.name)) return { from: node.from, to: node.to };
    if (/^(?:Paragraph|Task|ATXHeading[1-6]|SetextHeading[12]|DefinitionTerm|DefinitionDescription)$/u.test(node.name)) {
      owner = { from: node.from, to: node.to };
    }
    // Containers own their fences, while their body paragraphs keep local
    // activation. Code/frontmatter boundaries never adopt enclosing prose.
    if (["CustomContainer", "FencedCode", "CodeBlock", "Table", "Frontmatter", "Document"].includes(node.name)) break;
  }
  return owner;
}
