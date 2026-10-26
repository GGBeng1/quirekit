import { parser } from "@lezer/html";
import type { SyntaxNode } from "@lezer/common";

const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

/** @param node - HTML parser element. @param source - Exact bounded candidate. @returns Whether its outer delimiters are complete. */
function closed(node: SyntaxNode, source: string): boolean {
  const open = node.getChild("OpenTag") ?? node.getChild("SelfClosingTag"), name = open?.getChild("TagName");
  if (!name || open!.getChild("⚠") || !source.slice(open!.from, open!.to).endsWith(">")) return false;
  const tag = source.slice(name.from, name.to).toLowerCase();
  const end = node.getChild("CloseTag"), close = end?.getChild("TagName");
  return voidTags.has(tag) || !!close && source.slice(close.from, close.to).toLowerCase() === tag
    && source.slice(end!.from, end!.to).endsWith(">");
}

/** @param source - An HTMLBlock or inline suffix confirmed by the Markdown tree. @param inline - Select only the first complete element.
 * @returns Complete bounded length, or zero to retain exact source during streaming. */
export function completeHtmlLength(source: string, inline: boolean): number {
  if (source.length > 65_536) return 0;
  const tree = parser.parse(source);
  let budget = 4096, depth = 0, valid = true;
  tree.iterate({ enter(node) {
    if (--budget < 0 || node.name === "Element" && ++depth > 32) { valid = false; return false; }
    return undefined;
  }, leave(node) { if (node.name === "Element") depth--; } });
  if (!valid) return 0;
  if (inline) {
    const first = tree.topNode.firstChild;
    return first?.name === "Element" && first.from === 0 && closed(first, source) ? first.to : 0;
  }
  for (let child = tree.topNode.firstChild; child; child = child.nextSibling) {
    if (child.name === "Element" && !closed(child, source)) return 0;
  }
  return source.length;
}
