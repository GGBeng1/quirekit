import {
  isWordAbstractNumbering,
  isWordNumberingLevel
} from "../model/validation";
import type { WordListKind, WordNumberingLevel } from "../types";
import {
  cloneWordNumberingPresetLevel,
  createOwnedSingleLevelPreset
} from "./ownership";
import type {
  WordNumberingMultilevelPresetContribution,
  WordNumberingPresetContribution,
  WordNumberingSingleLevelPresetContribution
} from "./types";

const wordNumberingLevelCount = 9;

/**
 * Validates and owns one contribution without retaining caller-mutable records.
 *
 * @param value - Candidate preset contribution.
 * @returns Deep-frozen semantic preset.
 */
export function normalizeWordNumberingPreset(
  value: WordNumberingPresetContribution
): WordNumberingPresetContribution {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Word numbering preset contributions must be objects.");
  }
  const presetId = value.id;
  assertPresetId(presetId);
  assertPresetKind(value.kind);
  if (value.scope === "singleLevel") return normalizeSingleLevelPreset(value);
  if (value.scope === "multilevel") return normalizeMultilevelPreset(value);
  throw new RangeError(`Word numbering preset "${presetId}" has unsupported scope.`);
}

/**
 * Validates and freezes one destination-independent level preset.
 *
 * @param preset - Candidate single-level contribution.
 * @returns Owned immutable contribution.
 */
function normalizeSingleLevelPreset(
  preset: WordNumberingSingleLevelPresetContribution
): WordNumberingSingleLevelPresetContribution {
  const candidate = { ...preset.level, level: 0 };
  if (!isWordNumberingLevel(candidate)) {
    throw new RangeError(
      `Word numbering preset "${preset.id}" has an invalid single level.`
    );
  }
  assertKindFormat(preset.id, preset.kind, [candidate]);
  assertSingleLevelTemplate(preset.id, candidate.text);
  const level = createOwnedSingleLevelPreset(
    cloneWordNumberingPresetLevel(candidate)
  );
  return Object.freeze({
    id: preset.id,
    kind: preset.kind,
    scope: "singleLevel",
    level
  });
}

/**
 * Validates and freezes one complete nine-level preset.
 *
 * @param preset - Candidate multilevel contribution.
 * @returns Owned immutable contribution.
 */
function normalizeMultilevelPreset(
  preset: WordNumberingMultilevelPresetContribution
): WordNumberingMultilevelPresetContribution {
  const expectedKeys = Array.from(
    { length: wordNumberingLevelCount },
    (_value, index) => String(index)
  );
  const keys = Object.keys(preset.levels);
  if (
    keys.length !== wordNumberingLevelCount
    || expectedKeys.some((key) => !keys.includes(key))
    || !isWordAbstractNumbering({
      id: preset.id,
      kind: preset.kind,
      levels: preset.levels
    })
  ) {
    throw new RangeError(
      `Word numbering preset "${preset.id}" must define valid levels 0 through 8.`
    );
  }
  const levels: Record<string, WordNumberingLevel> = {};
  for (const key of expectedKeys) {
    const level = preset.levels[key]!;
    assertMultilevelTemplate(preset.id, level);
    levels[key] = cloneWordNumberingPresetLevel(level);
  }
  assertKindFormat(preset.id, preset.kind, Object.values(levels));
  Object.freeze(levels);
  return Object.freeze({
    id: preset.id,
    kind: preset.kind,
    scope: "multilevel",
    levels
  });
}

/** @param id - Candidate contribution id. */
function assertPresetId(id: unknown): void {
  if (typeof id !== "string" || id.length === 0 || id.trim() !== id) {
    throw new RangeError("Word numbering preset ids must be non-empty trimmed strings.");
  }
}

/** @param kind - Candidate list kind. */
function assertPresetKind(kind: unknown): asserts kind is WordListKind {
  if (kind !== "ordered" && kind !== "bullet" && kind !== "task") {
    throw new RangeError("Word numbering presets require ordered, bullet, or task kind.");
  }
}

/**
 * Keeps list-family metadata consistent with every effective level format.
 *
 * @param id - Preset id used by diagnostics.
 * @param kind - Declared semantic list family.
 * @param levels - Effective level tuples.
 */
function assertKindFormat(
  id: string,
  kind: WordListKind,
  levels: readonly WordNumberingLevel[]
): void {
  const expectsBullet = kind !== "ordered";
  if (levels.some((level) => (level.format === "bullet") !== expectsBullet)) {
    throw new RangeError(
      `Word numbering preset "${id}" has formats incompatible with kind "${kind}".`
    );
  }
}

/**
 * Restricts a portable single-level template to its own remappable counter.
 *
 * @param id - Preset id used by diagnostics.
 * @param text - Candidate marker template.
 */
function assertSingleLevelTemplate(id: string, text: string): void {
  if ([...text.matchAll(/%([0-9]+)/gu)].some((match) => match[1] !== "1")) {
    throw new RangeError(
      `Word numbering preset "${id}" single-level text may reference only %1.`
    );
  }
}

/**
 * Rejects multilevel templates that reference levels deeper than their owner.
 *
 * @param id - Preset id used by diagnostics.
 * @param level - Candidate canonical level.
 */
function assertMultilevelTemplate(id: string, level: WordNumberingLevel): void {
  const references = [...level.text.matchAll(/%([0-9]+)/gu)];
  if (references.some((match) => Number(match[1]) > level.level + 1)) {
    throw new RangeError(
      `Word numbering preset "${id}" level ${level.level} references a deeper level.`
    );
  }
}
