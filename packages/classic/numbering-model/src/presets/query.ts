import type { QuireEditor } from "@quirekit/core";
import { collectSelectedWordParagraphs } from "@quirekit/classic-paragraph-model";
import {
  resolveWordNumberingRegistry,
  resolveWordParagraphNumbering
} from "../model";
import { defaultWordNumberingParagraphTypes } from "../selection";
import {
  areWordNumberingDefinitionsEqual,
  areWordNumberingLevelsEqual,
  materializeWordNumberingPreset,
  materializeWordNumberingSingleLevelPreset
} from "./materialize";
import { collectWordNumberingPresetRegistry } from "./registry";

/**
 * Reports whether one semantic preset is active across the current selection.
 *
 * Preset and document ids are deliberately ignored. Every selected paragraph must
 * resolve to the matching kind and effective tuple, including task-state presence.
 *
 * @param editor - Editor owning state and resolved preset contributions.
 * @param presetId - Stable semantic preset id.
 * @param paragraphTypes - Paragraph-like node names participating in numbering.
 * @returns Whether every selected paragraph semantically matches the preset.
 */
export function isWordNumberingPresetActive(
  editor: QuireEditor,
  presetId: string,
  paragraphTypes: readonly string[] = defaultWordNumberingParagraphTypes
): boolean {
  const preset = collectWordNumberingPresetRegistry(editor.extensions).get(presetId);
  if (preset === undefined) return false;
  const targets = collectSelectedWordParagraphs(editor.state, paragraphTypes);
  if (targets.length === 0) return false;
  const registry = resolveWordNumberingRegistry(
    editor.state.doc.attrs.wordNumberingRegistry
  );
  return targets.every(({ node }) => {
    const reference = resolveWordParagraphNumbering(node.attrs.wordNumbering);
    if (reference === null) return false;
    const instance = registry.nums[reference.numId];
    const definition = instance === undefined
      ? undefined
      : registry.abstractNums[instance.abstractNumId];
    if (definition === undefined || definition.kind !== preset.kind) return false;
    if ((reference.task !== null) !== (preset.kind === "task")) return false;
    if (preset.scope === "singleLevel") {
      const level = definition.levels[String(reference.level)];
      return level !== undefined && areWordNumberingLevelsEqual(
        level,
        materializeWordNumberingSingleLevelPreset(preset, reference.level)
      );
    }
    return areWordNumberingDefinitionsEqual(
      definition,
      materializeWordNumberingPreset(preset, definition, 0, definition.id)
    );
  });
}
