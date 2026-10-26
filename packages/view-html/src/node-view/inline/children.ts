import type { Decoration, DecorationAttrs, Node as ProseMirrorNode } from "@quirekit/pm";
import type { HtmlDecoratedChild } from "../types";

/**
 * Partitions one canonical text slice at local decoration boundaries.
 * @param node - Text slice, already cut at widget boundaries.
 * @param from - Absolute model start.
 * @param contentStart - Model origin for the parent's local decorations.
 * @param decorations - Parent-local presentation spans.
 * @returns Owned text slices; presentation adds no model positions or marks.
 */
export function createHtmlInlineChildren(node: ProseMirrorNode, from: number, contentStart: number, decorations: readonly Decoration[]): HtmlDecoratedChild[] {
  const start = from - contentStart, end = start + node.nodeSize;
  const spans = decorations.filter(span => span.inline && span.from < end && span.to > start);
  // Keep the existing exact-mark fast path and its factory/DOM identity. A
  // partial or unmarked span needs its own retained presentation owner.
  if (node.marks.length && spans.every(span => span.from === start && span.to === end)) {
    return [{ kind: "text", node, range: { from, to: from + node.nodeSize } }];
  }
  const boundaries = [...new Set([start, end, ...spans.flatMap(span => [Math.max(start, span.from), Math.min(end, span.to)])])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((left, index) => {
    const right = boundaries[index + 1]!, attrs: DecorationAttrs = {};
    // Merge overlapping styles in source order inside an exact local slice.
    // Wrappers remain separate from canonical marks, including unmarked code.
    for (const span of spans) {
      if (span.from > left || span.to < right) continue;
      const values = (span.type as unknown as { attrs: DecorationAttrs }).attrs;
      for (const [name, value] of Object.entries(values)) {
        if (typeof value !== "string") continue;
        attrs[name] = attrs[name] && (name === "class" || name === "style")
          ? `${attrs[name]}${name === "style" ? ";" : " "}${value}` : value;
      }
    }
    return { kind: "text", node: node.cut(left - start, right - start), range: { from: contentStart + left, to: contentStart + right },
      ...(Object.keys(attrs).length ? { inlineAttrs: attrs } : {}) };
  });
}
