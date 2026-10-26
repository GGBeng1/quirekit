import type {
  WordNumberingLevel
} from "../types";
import type {
  WordNumberingPresetContribution,
  WordNumberingPresetRegistry
} from "../presets";
import { normalizeWordNumberingPreset } from "../presets/validation";
import {
  mergeCanonicalLevel,
  mergeSingleLevel
} from "./merge";
import type {
  WordNumberingTemplateDraft,
  WordNumberingTemplateIndexedLevelOverride
} from "./types";

/**
 * Compiles a friendly partial draft into an owned semantic numbering preset.
 *
 * The selected base supplies every omitted field. Multilevel drafts therefore
 * produce Word's complete nine-level definition without requiring callers to
 * manage nine rows.
 *
 * @param draft - Stable partial template authored by a host or product surface.
 * @param registry - Immutable semantic preset registry used to resolve the base.
 * @returns Deep-frozen single-level or complete multilevel preset.
 */
export function compileWordNumberingTemplate(
  draft: WordNumberingTemplateDraft,
  registry: WordNumberingPresetRegistry
): WordNumberingPresetContribution {
  assertDraftObject(draft);
  const base = resolveBasePreset(draft.basePresetId, registry);
  if (base.scope !== draft.scope) {
    throw new RangeError(
      `Word numbering template "${draft.id}" requires a ${draft.scope} base, `
      + `but "${draft.basePresetId}" has ${base.scope} scope.`
    );
  }

  if (draft.scope === "singleLevel" && base.scope === "singleLevel") {
    return normalizeWordNumberingPreset({
      id: draft.id,
      kind: base.kind,
      scope: "singleLevel",
      level: mergeSingleLevel(base.level, draft.level)
    });
  }

  if (draft.scope === "multilevel" && base.scope === "multilevel") {
    assertAscendingLevelOverrides(draft.id, draft.levels);
    const overrides = new Map(
      draft.levels.map((override) => [override.level, override])
    );
    const levels: Record<string, WordNumberingLevel> = {};
    for (let level = 0; level < 9; level += 1) {
      const inherited = base.levels[String(level)]!;
      levels[String(level)] = mergeCanonicalLevel(
        inherited,
        overrides.get(level)
      );
    }
    return normalizeWordNumberingPreset({
      id: draft.id,
      kind: base.kind,
      scope: "multilevel",
      levels
    });
  }

  throw new RangeError(
    `Word numbering template "${draft.id}" has an unsupported draft shape.`
  );
}

/**
 * Resolves and owns a compiler base before reading any nested fields.
 *
 * @param basePresetId - Stable semantic base id.
 * @param registry - Public preset lookup.
 * @returns Validated immutable compiler base.
 */
function resolveBasePreset(
  basePresetId: string,
  registry: WordNumberingPresetRegistry
): WordNumberingPresetContribution {
  if (typeof basePresetId !== "string" || basePresetId.trim() !== basePresetId) {
    throw new RangeError("Word numbering template base ids must be trimmed strings.");
  }
  const base = registry.get(basePresetId);
  if (base === undefined) {
    throw new RangeError(
      `Unknown Word numbering template base preset "${basePresetId}".`
    );
  }
  return normalizeWordNumberingPreset(base);
}

/**
 * Enforces deterministic, unambiguous multilevel override order.
 *
 * @param id - Draft id used by diagnostics.
 * @param levels - Explicit indexed overrides.
 */
function assertAscendingLevelOverrides(
  id: string,
  levels: readonly WordNumberingTemplateIndexedLevelOverride[]
): void {
  if (!Array.isArray(levels)) {
    throw new TypeError(`Word numbering template "${id}" levels must be an array.`);
  }
  let previous = -1;
  for (const override of levels) {
    if (
      override === null
      || typeof override !== "object"
      || !Number.isInteger(override.level)
      || override.level < 0
      || override.level > 8
    ) {
      throw new RangeError(
        `Word numbering template "${id}" has a level outside zero through eight.`
      );
    }
    if (override.level <= previous) {
      throw new RangeError(
        `Word numbering template "${id}" levels must be unique and ascending.`
      );
    }
    previous = override.level;
  }
}

/** @param draft - Candidate public draft. */
function assertDraftObject(draft: WordNumberingTemplateDraft): void {
  if (draft === null || typeof draft !== "object" || Array.isArray(draft)) {
    throw new TypeError("Word numbering template drafts must be objects.");
  }
}
