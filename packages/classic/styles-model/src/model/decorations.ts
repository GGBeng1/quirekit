import type { WordParagraphBorders } from "@quirekit/classic-paragraph-model";

/**
 * Inherits absent sides while explicit nil/none remain authoritative overrides.
 * @param inherited - Earlier style-chain border values.
 * @param delta - Later style or paragraph-local border values.
 * @returns Effective six-edge topology, without merging fields inside an edge.
 */
export function mergeWordParagraphBorders(
  inherited: WordParagraphBorders | null,
  delta: WordParagraphBorders | null | undefined
): WordParagraphBorders | null {
  if (delta == null) return inherited;
  if (inherited === null) return delta;
  return {
    top: delta.top ?? inherited.top,
    start: delta.start ?? inherited.start,
    bottom: delta.bottom ?? inherited.bottom,
    end: delta.end ?? inherited.end,
    between: delta.between ?? inherited.between,
    bar: delta.bar ?? inherited.bar
  };
}
