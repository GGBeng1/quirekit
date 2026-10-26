import type { SyntaxNode } from "@lezer/common";

/**
 * Shields Markdown-owned children from HTML tokenization while retaining exact offsets.
 * Code, links and custom nodes may contain angle brackets; HTML must not reinterpret them.
 * @param parent - Canonical inline owner.
 * @param from - HTML island candidate start.
 * @param source - Exact candidate source.
 * @returns Equal-length HTML input whose text positions still address the Markdown snapshot.
 */
export function protectMarkdown(parent: SyntaxNode, from: number, source: string): string {
  const parts: string[] = [];
  let offset = 0;
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (child.from < from || child.to > from + source.length || child.name === "HTMLTag") continue;
    const start = child.from - from, end = child.to - from;
    parts.push(source.slice(offset, start), source.slice(start, end).replace(/[^\n]/g, "x")); offset = end;
  }
  parts.push(source.slice(offset));
  return parts.join("");
}
