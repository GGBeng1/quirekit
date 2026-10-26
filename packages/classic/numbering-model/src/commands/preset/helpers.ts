import type { CommandProps } from "@quirekit/core";
import type { SelectedWordParagraph } from "@quirekit/classic-paragraph-model";
import {
  createDefaultWordNumberingRegistry,
  getDefaultWordAbstractNumId
} from "../../model";
import type {
  WordAbstractNumbering,
  WordNumberingRegistry,
  WordParagraphNumbering
} from "../../types";
import type { WordNumberingPresetContribution } from "../../presets/types";
import { collectAllWordParagraphs } from "../targets";

/**
 * Applies task-state presence to every paragraph in one concrete sequence.
 *
 * @param context - Active command transaction.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @param numId - Concrete sequence whose definition changed.
 * @param task - Whether the new definition is a task family.
 */
export function updateSequenceTaskMetadata(
  context: CommandProps,
  paragraphTypes: readonly string[],
  numId: string,
  task: boolean
): void {
  for (const target of collectAllWordParagraphs(context.tr.doc, paragraphTypes)) {
    if (target.numbering?.numId !== numId) continue;
    writeParagraphNumbering(context, target, {
      ...target.numbering,
      task: task ? target.numbering.task ?? { checked: false } : null
    });
  }
}

/**
 * Reports whether task-state presence already matches one complete sequence.
 *
 * @param context - Active command context.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @param numId - Concrete sequence id.
 * @param task - Desired task-state presence.
 * @returns Whether every sequence paragraph already matches.
 */
export function sequenceTaskMetadataMatches(
  context: CommandProps,
  paragraphTypes: readonly string[],
  numId: string,
  task: boolean
): boolean {
  return collectAllWordParagraphs(context.tr.doc, paragraphTypes)
    .filter(({ numbering }) => numbering?.numId === numId)
    .every(({ numbering }) => (numbering?.task !== null) === task);
}

/**
 * Writes one paragraph reference while retaining unrelated node attributes.
 *
 * @param context - Active command transaction.
 * @param target - Paragraph-like node and position.
 * @param numbering - Complete canonical paragraph numbering reference.
 */
export function writeParagraphNumbering(
  context: CommandProps,
  target: SelectedWordParagraph,
  numbering: WordParagraphNumbering
): void {
  context.tr.setNodeMarkup(target.position, undefined, {
    ...target.node.attrs,
    wordNumbering: numbering
  });
}

/**
 * Resolves one shared concrete id only when every target is already numbered.
 *
 * @param references - Selection references in document order.
 * @returns Shared id or undefined for plain/mixed sequences.
 */
export function resolveSharedNumId(
  references: readonly (WordParagraphNumbering | null)[]
): string | undefined {
  const first = references[0]?.numId;
  return first !== undefined && references.every((reference) => reference?.numId === first)
    ? first
    : undefined;
}

/**
 * Selects the destination level for a portable single-level preset.
 *
 * @param preset - Semantic preset being applied.
 * @param references - Existing selection references.
 * @returns Uniform existing level or level zero.
 */
export function resolveDestinationLevel(
  preset: WordNumberingPresetContribution,
  references: readonly (WordParagraphNumbering | null)[]
): number {
  if (preset.scope === "multilevel") return 0;
  const first = references[0]?.level;
  return first !== undefined && references.every((reference) => reference?.level === first)
    ? first
    : 0;
}

/**
 * Checks selected paragraph references for no-op application.
 *
 * @param references - Existing selection references.
 * @param preset - Semantic preset being applied.
 * @param destinationLevel - Single-level destination.
 * @returns Whether levels and task-state presence already match.
 */
export function referencesMatchPreset(
  references: readonly (WordParagraphNumbering | null)[],
  preset: WordNumberingPresetContribution,
  destinationLevel: number
): boolean {
  return references.every((reference) =>
    reference !== null
    && (preset.scope === "multilevel" || reference.level === destinationLevel)
    && ((reference.task !== null) === (preset.kind === "task"))
  );
}

/**
 * Resolves one concrete instance's abstract definition.
 *
 * @param registry - Current canonical registry.
 * @param numId - Concrete instance id.
 * @returns Referenced definition or undefined.
 */
export function resolveDefinition(
  registry: WordNumberingRegistry,
  numId: string
): WordAbstractNumbering | undefined {
  const instance = registry.nums[numId];
  return instance === undefined
    ? undefined
    : registry.abstractNums[instance.abstractNumId];
}

/**
 * Resolves a fresh complete base for cross-family or plain application.
 *
 * @param kind - Desired canonical list family.
 * @returns Complete built-in abstract definition.
 */
export function resolveDefaultDefinition(
  kind: WordNumberingPresetContribution["kind"]
): WordAbstractNumbering {
  const registry = createDefaultWordNumberingRegistry();
  return registry.abstractNums[getDefaultWordAbstractNumId(kind)]!;
}
