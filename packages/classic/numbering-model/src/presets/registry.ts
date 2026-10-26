import {
  collectQuireExtensionContributions,
  type QuireAnyExtension
} from "@quirekit/core";
import type {
  WordNumberingPresetContribution,
  WordNumberingPresetRegistry
} from "./types";
import { normalizeWordNumberingPreset } from "./validation";

/**
 * Collects and validates semantic numbering presets from resolved extensions.
 *
 * @param extensions - Resolved Extension, Node, and Mark set in manager order.
 * @returns Immutable registry keyed by globally unique preset id.
 */
export function collectWordNumberingPresetRegistry(
  extensions: readonly QuireAnyExtension[]
): WordNumberingPresetRegistry {
  const presets: WordNumberingPresetContribution[] = [];
  const byId = new Map<string, WordNumberingPresetContribution>();
  const owners = new Map<string, string>();
  const owned = collectQuireExtensionContributions<WordNumberingPresetContribution>(
    extensions,
    "addWordNumberingPresets"
  );

  for (const entry of owned) {
    const preset = normalizeWordNumberingPreset(entry.contribution);
    const previousOwner = owners.get(preset.id);
    if (previousOwner !== undefined) {
      throw new RangeError(
        `Duplicate Word numbering preset id "${preset.id}" from extensions `
        + `"${previousOwner}" and "${entry.extensionName}".`
      );
    }
    owners.set(preset.id, entry.extensionName);
    byId.set(preset.id, preset);
    presets.push(preset);
  }

  const frozenPresets = Object.freeze(presets.slice());
  return Object.freeze({
    presets: frozenPresets,
    get(id: string) {
      return byId.get(id);
    }
  });
}
