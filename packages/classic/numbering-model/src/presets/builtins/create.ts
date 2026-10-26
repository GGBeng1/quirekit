import { createDefaultWordNumberingRegistry } from "../../model";
import type { WordNumberingLevel } from "../../types";
import type {
  WordNumberingMultilevelPresetContribution,
  WordNumberingPresetContribution,
  WordNumberingSingleLevelPreset,
  WordNumberingSingleLevelPresetContribution
} from "../types";
import {
  circleWordBulletPresetId,
  decimalDotWordOrderedPresetId,
  decimalRightParenWordOrderedPresetId,
  defaultWordBulletPresetId,
  defaultWordOrderedPresetId,
  defaultWordTaskPresetId,
  diamondWordBulletPresetId,
  discWordBulletPresetId,
  enclosedCircleWordOrderedPresetId,
  lowerLetterDotWordOrderedPresetId,
  lowerRomanDotWordOrderedPresetId,
  parenthesizedDecimalWordOrderedPresetId,
  parenthesizedLetterWordOrderedPresetId,
  squareWordBulletPresetId,
  upperLetterDotWordOrderedPresetId,
  upperRomanDotWordOrderedPresetId
} from "./ids";
import { createBuiltinOrderedOutlines } from "./ordered";

/** Counter marker variants shown as portable single-level ordered presets. */
const orderedMarkers = [
  [decimalDotWordOrderedPresetId, "decimal", "%1."],
  [decimalRightParenWordOrderedPresetId, "decimal", "%1)"],
  [parenthesizedDecimalWordOrderedPresetId, "decimal", "(%1)"],
  [lowerLetterDotWordOrderedPresetId, "lowerLetter", "%1."],
  [parenthesizedLetterWordOrderedPresetId, "lowerLetter", "(%1)"],
  [upperLetterDotWordOrderedPresetId, "upperLetter", "%1."],
  [lowerRomanDotWordOrderedPresetId, "lowerRoman", "%1."],
  [upperRomanDotWordOrderedPresetId, "upperRoman", "%1."],
  [enclosedCircleWordOrderedPresetId, "decimalEnclosedCircleChinese", "%1"]
] as const;

/** Literal bullet variants shown as portable single-level presets. */
const bulletMarkers = [
  [discWordBulletPresetId, "•"],
  [circleWordBulletPresetId, "◦"],
  [squareWordBulletPresetId, "▪"],
  [diamondWordBulletPresetId, "◆"]
] as const;

/**
 * Creates built-in presets through the same public contribution shape as consumers.
 *
 * @returns Fresh complete definitions for built-in list families and gallery presets.
 */
export function createBuiltinWordNumberingPresets(): readonly WordNumberingPresetContribution[] {
  const registry = createDefaultWordNumberingRegistry();
  const ordered = registry.abstractNums["quirekit-decimal"]!;
  const bullet = registry.abstractNums["quirekit-bullet"]!;
  return Object.freeze([
    createBuiltinPreset(defaultWordOrderedPresetId, ordered),
    ...orderedMarkers.map(([id, format, text]) =>
      createSingleLevelPreset(id, "ordered", ordered.levels["0"]!, {
        format,
        text
      })
    ),
    ...createBuiltinOrderedOutlines(ordered),
    createBuiltinPreset(defaultWordBulletPresetId, bullet),
    ...bulletMarkers.map(([id, text]) =>
      createSingleLevelPreset(id, "bullet", bullet.levels["0"]!, {
        format: "bullet",
        text
      })
    ),
    createBuiltinPreset(
      defaultWordTaskPresetId,
      registry.abstractNums["quirekit-task"]!
    )
  ]);
}

/**
 * Projects one canonical built-in definition into the public preset shape.
 *
 * @param id - Stable semantic preset id.
 * @param definition - Complete built-in abstract definition.
 * @returns Multilevel preset contribution.
 */
function createBuiltinPreset(
  id: string,
  definition: ReturnType<
    typeof createDefaultWordNumberingRegistry
  >["abstractNums"][string]
): WordNumberingMultilevelPresetContribution {
  return {
    id,
    kind: definition.kind,
    scope: "multilevel",
    levels: definition.levels
  };
}

/**
 * Creates one portable single-level preset from canonical built-in geometry.
 *
 * @param id - Stable semantic preset id.
 * @param kind - Ordered or bullet product family.
 * @param base - Canonical level supplying complete geometry and behavior.
 * @param marker - Counter format and visible marker template.
 * @returns Single-level semantic preset contribution.
 */
function createSingleLevelPreset(
  id: string,
  kind: "ordered" | "bullet",
  base: WordNumberingLevel,
  marker: Pick<WordNumberingSingleLevelPreset, "format" | "text">
): WordNumberingSingleLevelPresetContribution {
  const {
    level: _level,
    restartAfterLevel: _restartAfterLevel,
    ...portable
  } = base;
  return {
    id,
    kind,
    scope: "singleLevel",
    level: {
      ...portable,
      ...marker,
      restartAfterLevel: null
    }
  };
}
