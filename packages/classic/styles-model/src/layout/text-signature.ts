import type { Node } from "@quirekit/pm";
import { resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { resolveWordCharacterAppearance } from "../character/appearance";
import { resolveWordParagraphAppearance } from "../model/resolve";
import type { WordParagraphStyleRegistry, WordTableStyleTextLayer } from "../model/types";

const signatures = new WeakMap<WordParagraphStyleRegistry, WeakMap<Node, string>>();

/**
 * Includes the semantic run definitions that this immutable paragraph consumes.
 * Unrelated definition edits keep its shape-cache identity unchanged. Table
 * occurrences resolve separately because the same paragraph can inherit different
 * conditional layers; ordinary paragraphs reuse their registry/node result.
 * @param node - Paragraph occurrence.
 * @param registry - Theme-resolved named definitions.
 * @param layer - Conditional table style below the paragraph style.
 * @returns Neutral shape-cache signature covering paragraph and run typography.
 */
export function wordStyleTextSignature(node: Node, registry: WordParagraphStyleRegistry, layer?: WordTableStyleTextLayer): string {
  const cache = signatures.get(registry) ?? new WeakMap<Node, string>();
  signatures.set(registry, cache);
  const cached = layer === undefined ? cache.get(node) : undefined;
  if (cached !== undefined) return cached;
  const formatting = resolveWordParagraphFormatting(node.attrs.wordParagraph);
  const text = resolveWordParagraphAppearance(registry, formatting, layer).text;
  const ids = new Set<string>();
  node.descendants(child => {
    if (!child.isText) return true;
    const mark = child.marks.find(item => item.type.name === "wordCharacterStyle");
    const id = mark?.attrs.styleId ?? registry.defaultCharacterStyleId;
    if (typeof id === "string") ids.add(id);
    return false;
  });
  const characters = [...ids].map(id => [id, resolveWordCharacterAppearance(registry, id, formatting.styleId, text)]);
  const signature = `word-paragraph-style-text:${JSON.stringify([text, characters])}`;
  if (layer === undefined) cache.set(node, signature);
  return signature;
}
