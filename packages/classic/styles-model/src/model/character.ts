import { characterStyleTextDelta } from "./text/toggles";
import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { WordNamedCharacterStyle, WordParagraphStyleDiagnostic, WordParagraphStyleRegistry } from "./types";
import { mergeWordStyleText } from "./text/merge";

/** Cached type-safe chains, scoped to the immutable registry identity. */
const chains = new WeakMap<WordParagraphStyleRegistry, Map<string, { styles: readonly WordNamedCharacterStyle[]; diagnostics: readonly WordParagraphStyleDiagnostic[] }>>();

/**
 * Resolves character typography over the paragraph occurrence, never over another character's result.
 * @param registry - Document styles.
 * @param styleId - Character identity, or null to use the declared default.
 * @param inherited - Effective paragraph/table text at this occurrence.
 * @returns Compiled properties and recoverable reference diagnostics.
 */
export function resolveWordNamedCharacterStyle(registry: WordParagraphStyleRegistry, styleId: string | null, inherited: QuireNodeCanvasTextStyle = {}) {
  const id = styleId ?? registry.defaultCharacterStyleId;
  if (!id) return { text: inherited, diagnostics: [] as readonly WordParagraphStyleDiagnostic[] };
  let cache = chains.get(registry);
  if (!cache) { cache = new Map(); chains.set(registry, cache); }
  let chain = cache.get(id);
  if (!chain) {
    const styles: WordNamedCharacterStyle[] = [], diagnostics: WordParagraphStyleDiagnostic[] = [], visited = new Set<string>();
    let cursor: string | null = id;
    while (cursor) {
      if (visited.has(cursor)) { diagnostics.push({ kind: "inheritance-cycle", styleId: cursor, message: `Character style inheritance cycle at ${cursor}.` }); break; }
      visited.add(cursor);
      const style: WordNamedCharacterStyle | undefined = registry.characterStyles?.[cursor];
      if (!style) { diagnostics.push({ kind: styles.length ? "missing-base" : "missing-style", styleId: cursor, message: `Missing character style ${cursor}.` }); break; }
      styles.push(style); cursor = style.basedOn;
    }
    let inheritedChain: QuireNodeCanvasTextStyle = {};
    const normalized = styles.reverse().map(style => {
      const text = characterStyleTextDelta(style.text, inheritedChain);
      inheritedChain = mergeWordStyleText(inheritedChain, text);
      return { ...style, text };
    });
    chain = { styles: normalized, diagnostics }; cache.set(id, chain);
  }
  return { text: chain.styles.reduce((text, style) => mergeWordStyleText(text, style.text), inherited), diagnostics: chain.diagnostics };
}
