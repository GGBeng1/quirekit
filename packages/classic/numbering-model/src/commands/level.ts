import type { CommandSpec } from "@quirekit/core";
import { resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { createDefaultWordNumberingRegistry, getDefaultWordAbstractNumId, resolveWordNumberingRegistry, resolveWordParagraphNumbering } from "../model";
import { allocateWordNumberingPresetAbstractId } from "../presets/materialize";
import { collectWordNumberingCommandTargets } from "./targets";

/**
 * Creates a command that changes selected list levels by one.
 *
 * @param delta - Positive one for deeper, negative one for shallower.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Level-adjustment command clamped to Word's nine levels.
 */
export function createAdjustWordListLevelCommand(
  delta: -1 | 1,
  paragraphTypes: readonly string[]
): CommandSpec {
  return () => (context) => {
    const targets = collectWordNumberingCommandTargets(context, paragraphTypes);
    let changed = false;
    let registry = resolveWordNumberingRegistry(context.tr.doc.attrs.wordNumberingRegistry);
    let registryChanged = false;
    for (const target of targets) {
      const numbering = resolveWordParagraphNumbering(target.node.attrs.wordNumbering);
      if (numbering === null) continue;
      const level = Math.min(8, Math.max(0, numbering.level + delta));
      if (level === numbering.level) continue;
      const instance = registry.nums[numbering.numId];
      const definition = instance && registry.abstractNums[instance.abstractNumId];
      if (!definition) continue;
      if (!definition.levels[String(level)]) {
        const id = allocateWordNumberingPresetAbstractId(registry);
        const fallback = createDefaultWordNumberingRegistry().abstractNums[getDefaultWordAbstractNumId(definition.kind)]!;
        registry = {
          ...registry,
          abstractNums: { ...registry.abstractNums, [id]: {
            ...definition, id, levels: { ...definition.levels, [String(level)]: fallback.levels[String(level)]! }
          } },
          nums: { ...registry.nums, [numbering.numId]: { ...instance!, abstractNumId: id } }
        };
        registryChanged = true;
      }
      const paragraph = resolveWordParagraphFormatting(target.node.attrs.wordParagraph);
      const nextLevel = registry.abstractNums[registry.nums[numbering.numId]!.abstractNumId]!.levels[String(level)]!;
      context.tr.setNodeMarkup(target.position, undefined, {
        ...target.node.attrs,
        wordNumbering: { ...numbering, level, startOverride: null },
        wordParagraph: paragraph.indentation.start === null && paragraph.indentation.firstLine === null
          && !nextLevel.paragraphStyleId ? target.node.attrs.wordParagraph : {
          ...paragraph,
          ...(nextLevel.paragraphStyleId ? { styleId: nextLevel.paragraphStyleId } : {}),
          indentation: { ...paragraph.indentation, start: null, firstLine: null }
        }
      });
      changed = true;
    }
    if (!changed) return false;
    if (registryChanged) context.tr.setDocAttribute("wordNumberingRegistry", registry);
    context.dispatch?.(context.tr);
    return true;
  };
}
