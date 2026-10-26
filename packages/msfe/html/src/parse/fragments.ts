import { parser } from "@lezer/html";
import type { SyntaxNode } from "@lezer/common";
import { contiguousTags, htmlTags, maxHtmlLength, voidTags } from "./policy";
import type { HtmlElement, HtmlFragment, HtmlRange } from "./types";

/**
 * Admits explicit complete structures; parser error recovery never authorizes hiding source.
 * @param source - Bounded candidate from the Markdown tree.
 * @param tags - Markdown-confirmed inline tag starts, or null for an HTMLBlock.
 * @returns Complete supported roots, retaining unsupported siblings as source.
 */
export function parseHtmlFragments(source: string, tags: ReadonlySet<number> | null): readonly HtmlFragment[] {
  if (source.length > maxHtmlLength) return [];
  const root = parser.parse(source).topNode;
  const fragments: HtmlFragment[] = [];
  for (let node = root.firstChild; node; node = node.nextSibling) {
    if (node.name !== "Element") continue;
    const elements: HtmlElement[] = [], entities: HtmlRange[] = [];
    let budget = 512;
    /** @param current - Original HTML subtree. @param depth - Nesting budget. @returns Whether every descendant has a reversible source range. */
    function visit(current: SyntaxNode, depth: number): boolean {
      if (--budget < 0 || depth > 32 || current.type.isError || current.name === "Comment") return false;
      if (current.name === "Element") {
        const open = current.getChild("OpenTag") ?? current.getChild("SelfClosingTag");
        const name = open?.getChild("TagName"), close = current.getChild("CloseTag");
        if (!open || !name) return false;
        const tag = source.slice(name.from, name.to).toLowerCase();
        const closeName = close?.getChild("TagName");
        if (!htmlTags.has(tag) || tags && !tags.has(open.from)
          || (!voidTags.has(tag) && (!close || !closeName || tags && !tags.has(close.from)
            || source.slice(closeName.from, closeName.to).toLowerCase() !== tag))) return false;
        // ViewPlugin replacements never remove a newline. Structures that require a
        // continuous table DOM use source fallback when split across CM lines.
        const multiline = source.slice(current.from, current.to).includes("\n");
        if (source.slice(open.from, open.to).includes("\n") || close && source.slice(close.from, close.to).includes("\n")
          || multiline && contiguousTags.has(tag)) return false;
        elements.push({ from: current.from, to: current.to, tag, open: { from: open.from, to: open.to },
          close: close ? { from: close.from, to: close.to } : null, multiline });
      }
      if (current.name === "EntityReference" || current.name === "CharacterReference") entities.push({ from: current.from, to: current.to });
      for (let child = current.firstChild; child; child = child.nextSibling) {
        // Attribute entities belong to the sanitizer, not to visible-text projection.
        if (child.name === "Attribute") continue;
        if (!visit(child, depth + Number(child.name === "Element"))) return false;
      }
      return true;
    }
    if (visit(node, 0)) fragments.push({ from: node.from, to: node.to, elements, entities });
  }
  // Physical CM rows remain authoritative. A line with several paragraph/heading
  // blocks cannot be flattened into one inline box without changing its meaning.
  const blockLines = new Map<number, number>();
  for (const fragment of fragments) for (const element of fragment.elements) {
    if (!/^(?:p|h[1-6])$/u.test(element.tag)) continue;
    const line = source.lastIndexOf("\n", element.from) + 1;
    blockLines.set(line, (blockLines.get(line) ?? 0) + 1);
  }
  return fragments.filter(fragment => !fragment.elements.some(element => /^(?:p|h[1-6])$/u.test(element.tag)
    && blockLines.get(source.lastIndexOf("\n", element.from) + 1)! > 1));
}
