import type { CommandProps } from "@quirekit/core";
import type {
  WordParagraphNumbering
} from "../../types";
import {
  resolveWordNumberingRegistry,
  resolveWordParagraphNumbering
} from "../../model";
import {
  allocateWordNumberingPresetAbstractId,
  areWordNumberingDefinitionsEqual,
  materializeWordNumberingPreset
} from "../../presets/materialize";
import type { WordNumberingPresetContribution } from "../../presets/types";
import { collectWordNumberingCommandTargets } from "../targets";
import { installWordNumberingDefinition } from "./install";
import {
  referencesMatchPreset,
  resolveDefaultDefinition,
  resolveDefinition,
  resolveDestinationLevel,
  resolveSharedNumId,
  sequenceTaskMetadataMatches,
  updateSequenceTaskMetadata,
  writeParagraphNumbering
} from "./helpers";

/**
 * Materializes one preset and updates definition, instance, and references together.
 *
 * @param context - Active command transaction authority.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @param preset - Resolved immutable semantic preset.
 * @returns Whether one document transaction was dispatched.
 */
export function applyWordNumberingPreset(
  context: CommandProps,
  paragraphTypes: readonly string[],
  preset: WordNumberingPresetContribution
): boolean {
  const targets = collectWordNumberingCommandTargets(context, paragraphTypes);
  if (targets.length === 0) return false;
  const registry = resolveWordNumberingRegistry(
    context.state.doc.attrs.wordNumberingRegistry
  );
  const references = targets.map(({ node }) =>
    resolveWordParagraphNumbering(node.attrs.wordNumbering)
  );
  const sharedNumId = resolveSharedNumId(references);
  const destinationLevel = resolveDestinationLevel(preset, references);
  const currentDefinition = sharedNumId === undefined
    ? undefined
    : resolveDefinition(registry, sharedNumId);
  const base = currentDefinition?.kind === preset.kind
    ? currentDefinition
    : resolveDefaultDefinition(preset.kind);
  const abstractNumId = allocateWordNumberingPresetAbstractId(registry);
  const definition = materializeWordNumberingPreset(
    preset,
    base,
    destinationLevel,
    abstractNumId
  );

  if (
    sharedNumId !== undefined
    && currentDefinition !== undefined
    && areWordNumberingDefinitionsEqual(currentDefinition, definition)
    && referencesMatchPreset(references, preset, destinationLevel)
    && sequenceTaskMetadataMatches(
      context,
      paragraphTypes,
      sharedNumId,
      preset.kind === "task"
    )
  ) return false;

  const installed = installWordNumberingDefinition(
    context,
    definition,
    sharedNumId
  );
  const numId = installed.numId;

  // Definition changes intentionally affect one complete concrete sequence.
  // Task metadata follows that same ownership so no paragraph renders as a task
  // without an interactive checked-state authority.
  if (sharedNumId !== undefined) {
    updateSequenceTaskMetadata(
      context,
      paragraphTypes,
      numId,
      preset.kind === "task"
    );
  }
  for (const [index, target] of targets.entries()) {
    const previous = references[index];
    const level = preset.scope === "singleLevel"
      ? destinationLevel
      : previous?.level ?? 0;
    const numbering: WordParagraphNumbering = {
      numId,
      level,
      startOverride: previous?.level === level && sharedNumId !== undefined
        ? previous.startOverride
        : null,
      task: preset.kind === "task"
        ? previous?.task ?? { checked: false }
        : null
    };
    writeParagraphNumbering(context, target, numbering);
  }
  context.dispatch?.(context.tr);
  return true;
}
