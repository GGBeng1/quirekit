import type {
  WordAbstractNumbering,
  WordNumberingCounterFormat,
  WordNumberingLevel
} from "../../types";
import type {
  WordNumberingMultilevelPresetContribution
} from "../types";
import {
  mixedEnclosedWordOrderedPresetId,
  mixedWordOrderedPresetId,
  officeWordOrderedPresetId
} from "./ids";

/** One counter format and marker-template writer in a cyclic outline. */
type OrderedLevelVariant = readonly [
  WordNumberingCounterFormat,
  (placeholder: string) => string
];

/** Decimal/lower-letter/lower-Roman cycle retained for compatibility. */
const mixedVariants: readonly OrderedLevelVariant[] = [
  ["decimal", (placeholder) => `${placeholder}.`],
  ["lowerLetter", (placeholder) => `(${placeholder})`],
  ["lowerRoman", (placeholder) => `(${placeholder})`]
];

/** Decimal, parenthesized decimal, and enclosed-circle office outline. */
const mixedEnclosedVariants: readonly OrderedLevelVariant[] = [
  ["decimal", (placeholder) => `${placeholder}.`],
  ["decimal", (placeholder) => `(${placeholder})`],
  ["decimalEnclosedCircleChinese", (placeholder) => placeholder]
];

/** Upper Roman, upper letter, decimal, and lower-letter-parenthesis outline. */
const officeVariants: readonly OrderedLevelVariant[] = [
  ["upperRoman", (placeholder) => `${placeholder}.`],
  ["upperLetter", (placeholder) => `${placeholder}.`],
  ["decimal", (placeholder) => `${placeholder}.`],
  ["lowerLetter", (placeholder) => `${placeholder})`]
];

/**
 * Creates all complete built-in ordered outline families.
 *
 * @param definition - Canonical ordered definition supplying level geometry.
 * @returns Complete immutable-shape multilevel contributions.
 */
export function createBuiltinOrderedOutlines(
  definition: WordAbstractNumbering
): readonly WordNumberingMultilevelPresetContribution[] {
  return [
    createCyclicOrderedPreset(
      mixedWordOrderedPresetId,
      definition,
      mixedVariants
    ),
    createCyclicOrderedPreset(
      mixedEnclosedWordOrderedPresetId,
      definition,
      mixedEnclosedVariants
    ),
    createCyclicOrderedPreset(
      officeWordOrderedPresetId,
      definition,
      officeVariants
    )
  ];
}

/**
 * Projects one ordered geometry base through a repeating semantic marker cycle.
 *
 * @param id - Stable semantic preset id.
 * @param definition - Complete ordered geometry base.
 * @param variants - Non-empty repeating marker variants.
 * @returns Complete nine-level ordered contribution.
 */
function createCyclicOrderedPreset(
  id: string,
  definition: WordAbstractNumbering,
  variants: readonly OrderedLevelVariant[]
): WordNumberingMultilevelPresetContribution {
  const levels: Record<string, WordNumberingLevel> = {};
  for (const [key, level] of Object.entries(definition.levels)) {
    const variant = variants[level.level % variants.length]!;
    const placeholder = `%${level.level + 1}`;
    levels[key] = {
      ...level,
      format: variant[0],
      text: variant[1](placeholder)
    };
  }
  return {
    id,
    kind: "ordered",
    scope: "multilevel",
    levels
  };
}
