import { collectSelectedWordParagraphs, type WordParagraphSelectionState } from "@quirekit/classic-paragraph-model";
import { resolveWordNumberingRegistry, resolveWordParagraphNumbering } from "../model";
import type { WordNumberingEditTarget } from "../templates/types";
import { defaultWordNumberingParagraphTypes } from "./query";

/**
 * Captures the real definition behind one selected concrete list, including sparse imports.
 *
 * @param state - Current document and selection.
 * @param paragraphTypes - Registered paragraph-like nodes.
 * @returns Immutable document snapshot, or undefined for a mixed/plain selection.
 */
export function readWordNumberingEditTarget(
  state: WordParagraphSelectionState,
  paragraphTypes: readonly string[] = defaultWordNumberingParagraphTypes
): WordNumberingEditTarget | undefined {
  const targets = collectSelectedWordParagraphs(state, paragraphTypes);
  const first = targets[0];
  const reference = first && resolveWordParagraphNumbering(first.node.attrs.wordNumbering);
  if (!first || !reference || !targets.every(({ node }) =>
    resolveWordParagraphNumbering(node.attrs.wordNumbering)?.numId === reference.numId
  )) return undefined;
  const registry = resolveWordNumberingRegistry(state.doc.attrs.wordNumberingRegistry);
  const instance = registry.nums[reference.numId];
  const definition = instance && registry.abstractNums[instance.abstractNumId];
  if (!definition?.levels[String(reference.level)]) return undefined;
  return { position: first.position, reference, definition };
}
