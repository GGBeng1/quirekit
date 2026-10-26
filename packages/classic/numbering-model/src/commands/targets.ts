import type { CommandProps } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import {
  collectSelectedWordParagraphs,
  type SelectedWordParagraph
} from "@quirekit/classic-paragraph-model";
import type {
  WordListKind,
  WordNumberingRegistry,
  WordParagraphNumbering
} from "../types";
import {
  resolveWordParagraphNumbering
} from "../model";

/** One paragraph-like node indexed across the complete document. */
export interface IndexedWordParagraph extends SelectedWordParagraph {
  /** Valid numbering reference or null for a plain paragraph. */
  readonly numbering: WordParagraphNumbering | null;
}

/**
 * Collects selected paragraph targets for one command.
 *
 * @param context - Active command context.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Selected paragraphs in document order.
 */
export function collectWordNumberingCommandTargets(
  context: CommandProps,
  paragraphTypes: readonly string[]
): readonly SelectedWordParagraph[] {
  // Reading `tr` refreshes the chainable snapshot, so a command chained after another sees its changes.
  void context.state.tr;
  return collectSelectedWordParagraphs(context.state, paragraphTypes);
}

/**
 * Collects every paragraph-like node for adjacent-list instance resolution.
 *
 * @param document - Canonical ProseMirror document.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Indexed paragraphs in document order.
 */
export function collectAllWordParagraphs(
  document: ProseMirrorNode,
  paragraphTypes: readonly string[]
): readonly IndexedWordParagraph[] {
  const allowed = new Set(paragraphTypes);
  const output: IndexedWordParagraph[] = [];
  document.descendants((node, position) => {
    if (!node.isTextblock || !allowed.has(node.type.name)) return true;
    output.push({
      position,
      node,
      numbering: resolveWordParagraphNumbering(node.attrs.wordNumbering)
    });
    return false;
  });
  return output;
}

/**
 * Resolves a paragraph reference to its product list kind.
 *
 * @param registry - Current numbering registry.
 * @param numbering - Paragraph numbering reference.
 * @returns Ordered, bullet, task, or null for a dangling reference.
 */
export function resolveWordParagraphListKind(
  registry: WordNumberingRegistry,
  numbering: WordParagraphNumbering | null
): WordListKind | null {
  if (numbering === null) return null;
  if (numbering.task !== null) return "task";
  const instance = registry.nums[numbering.numId];
  const level = instance && registry.abstractNums[instance.abstractNumId]?.levels[String(numbering.level)];
  return level === undefined ? null : level.format === "bullet" ? "bullet" : "ordered";
}

/**
 * Finds a compatible numbering instance immediately beside the selection.
 *
 * @param document - Canonical document.
 * @param targets - Selected paragraphs.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @param registry - Current numbering registry.
 * @param kind - Desired list family.
 * @returns Adjacent compatible concrete id, or undefined.
 */
export function findAdjacentWordNumberingInstance(
  document: ProseMirrorNode,
  targets: readonly SelectedWordParagraph[],
  paragraphTypes: readonly string[],
  registry: WordNumberingRegistry,
  kind: WordListKind
): string | undefined {
  const all = collectAllWordParagraphs(document, paragraphTypes);
  const selectedPositions = new Set(targets.map(({ position }) => position));
  const firstIndex = all.findIndex(({ position }) => selectedPositions.has(position));
  if (firstIndex < 0) return undefined;
  let lastIndex = firstIndex;
  for (let index = firstIndex + 1; index < all.length; index += 1) {
    if (selectedPositions.has(all[index]?.position ?? -1)) lastIndex = index;
  }
  const candidates = [all[firstIndex - 1], all[lastIndex + 1]];
  for (const candidate of candidates) {
    if (
      candidate?.numbering !== null
      && candidate?.numbering !== undefined
      && resolveWordParagraphListKind(registry, candidate.numbering) === kind
    ) {
      return candidate.numbering.numId;
    }
  }
  return undefined;
}
