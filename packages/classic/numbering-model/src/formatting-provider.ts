import type {
  QuireFormattingMutationContext,
  QuireFormattingProvider
} from "@quirekit/extensions";
import { collectSelectedWordParagraphs } from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphNumbering } from "./model";
import type { WordParagraphNumbering } from "./types";

/**
 * Creates the Word numbering provider for registered paragraph nodes.
 *
 * @param paragraphTypes - Paragraph-like node names carrying wordNumbering attrs.
 * @returns Provider that copies or clears flat numbering references.
 */
export function createWordNumberingFormattingProvider(
  paragraphTypes: readonly string[]
): QuireFormattingProvider {
  return {
    id: "quirekit.word-numbering-formatting",
    order: 300,
    capture: ({ state, scope }) => {
      if (scope.level !== "paragraph") return undefined;
      const target = collectSelectedWordParagraphs(state, paragraphTypes)[0];
      return target === undefined
        ? undefined
        : resolveWordParagraphNumbering(target.node.attrs.wordNumbering);
    },
    apply: (context, value) => mutateWordNumbering(
      context,
      paragraphTypes,
      value as WordParagraphNumbering | null
    ),
    clear: context => mutateWordNumbering(context, paragraphTypes, null)
  };
}

/**
 * Replaces numbering references on selected paragraphs.
 *
 * @param context - Shared formatting transaction.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @param numbering - Captured numbering reference or null for clear.
 * @returns Whether any paragraph changed.
 */
function mutateWordNumbering(
  context: QuireFormattingMutationContext,
  paragraphTypes: readonly string[],
  numbering: WordParagraphNumbering | null
): boolean {
  if (context.scope.level !== "paragraph") return false;
  const targets = collectSelectedWordParagraphs(context.state, paragraphTypes);
  let changed = false;
  for (const target of targets) {
    const current = resolveWordParagraphNumbering(
      target.node.attrs.wordNumbering
    );
    if (JSON.stringify(current) === JSON.stringify(numbering)) continue;
    context.tr.setNodeMarkup(target.position, undefined, {
      ...target.node.attrs,
      wordNumbering: numbering
    });
    changed = true;
  }
  return changed;
}
