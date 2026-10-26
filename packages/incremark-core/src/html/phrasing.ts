import type { RootContent } from "hast";
import type { SyntaxNode } from "@lezer/common";

const phrasing = new Set(["a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "del", "em", "i", "img", "input", "ins",
  "kbd", "mark", "q", "rp", "rt", "ruby", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr"]);

/** @param node - Markdown source owner. @returns Whether an HTML anchor would nest within a Markdown link. */
function insideLink(node: SyntaxNode): boolean {
  for (let parent: SyntaxNode | null = node; parent; parent = parent.parent) if (parent.name === "Link") return true;
  return false;
}

/**
 * Keeps server markup valid in a Markdown paragraph so the browser cannot rearrange it before hydration.
 * @param nodes - Sanitized island children.
 * @param owner - Canonical Markdown parent.
 * @returns Whether every HTML element is legal phrasing content in its surrounding Markdown context.
 */
export function safeInlineStructure(nodes: readonly RootContent[], owner: SyntaxNode): boolean {
  const link = insideLink(owner);
  /** @param node - Sanitized descendant. @returns Whether native HTML can remain in this inline slot. */
  function accepts(node: RootContent): boolean {
    return node.type !== "element" || phrasing.has(node.tagName) && !(link && node.tagName === "a") && node.children.every(accepts);
  }
  return nodes.every(accepts);
}
