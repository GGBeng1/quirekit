import type {
  QuireFormattingMutationContext,
  QuireFormattingProvider
} from "@quirekit/extensions";
import {
  defaultWordParagraphFormatting,
  resolveWordParagraphFormatting
} from "./model";
import { collectSelectedWordParagraphs } from "./selection";
import type { WordParagraphFormatting } from "./types";

/** Paragraph formatting copied without source-owned preservation metadata. */
type WordParagraphFormattingSnapshot = Omit<
  WordParagraphFormatting,
  "preservation"
>;

/**
 * Creates the Word paragraph formatting provider for registered textblocks.
 *
 * @param paragraphTypes - Paragraph-like node names carrying wordParagraph attrs.
 * @returns Provider that copies and clears paragraph formatting without touching preservation.
 */
export function createWordParagraphFormattingProvider(
  paragraphTypes: readonly string[]
): QuireFormattingProvider {
  return {
    id: "quirekit.word-paragraph-formatting",
    order: 200,
    capture: ({ state, scope }) => {
      if (scope.level !== "paragraph") return undefined;
      const target = collectSelectedWordParagraphs(state, paragraphTypes)[0];
      if (target === undefined) return undefined;
      return toSnapshot(resolveWordParagraphFormatting(
        target.node.attrs.wordParagraph
      ));
    },
    apply: (context, value) => mutateWordParagraphFormatting(
      context,
      paragraphTypes,
      value as WordParagraphFormattingSnapshot
    ),
    clear: context => mutateWordParagraphFormatting(
      context,
      paragraphTypes,
      toSnapshot(defaultWordParagraphFormatting)
    )
  };
}

/**
 * Removes the target-owned preservation field from a copied paragraph value.
 *
 * @param formatting - Canonical source paragraph formatting.
 * @returns Snapshot containing only editable first-class fields.
 */
function toSnapshot(
  formatting: WordParagraphFormatting
): WordParagraphFormattingSnapshot {
  const { preservation: _preservation, ...snapshot } = formatting;
  return snapshot;
}

/**
 * Replaces selected paragraph formatting while retaining each target's preservation envelope.
 *
 * @param context - Shared formatting transaction.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @param snapshot - Editable paragraph fields to apply.
 * @returns Whether any paragraph changed.
 */
function mutateWordParagraphFormatting(
  context: QuireFormattingMutationContext,
  paragraphTypes: readonly string[],
  snapshot: WordParagraphFormattingSnapshot
): boolean {
  if (context.scope.level !== "paragraph") return false;
  const targets = collectSelectedWordParagraphs(context.state, paragraphTypes);
  let changed = false;
  for (const target of targets) {
    const current = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    const next: WordParagraphFormatting = {
      ...snapshot,
      preservation: current.preservation
    };
    if (JSON.stringify(current) === JSON.stringify(next)) continue;
    context.tr.setNodeMarkup(target.position, undefined, {
      ...target.node.attrs,
      wordParagraph: next
    });
    changed = true;
  }
  return changed;
}
