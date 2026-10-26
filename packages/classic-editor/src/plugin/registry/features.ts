import type {
  ClassicEditorFeatureOptions,
  ClassicEditorResolvedFeatures
} from "../../types";

/**
 * Resolves preset and instance feature options into concrete booleans.
 *
 * @param defaults - Preset feature defaults.
 * @param overrides - Instance-level feature overrides.
 * @returns Fully resolved feature map.
 */
export function resolveClassicEditorFeatures(
  defaults: ClassicEditorFeatureOptions,
  overrides: ClassicEditorFeatureOptions = {}
): ClassicEditorResolvedFeatures {
  const resolved: Record<string, boolean> = {};

  for (const [id, enabled] of Object.entries({ ...defaults, ...overrides })) {
    resolved[id] = enabled === true;
  }

  return Object.freeze(resolved);
}

/**
 * Reports whether an optional feature requirement is satisfied.
 *
 * @param feature - Optional feature id.
 * @param features - Resolved feature switches.
 * @returns Whether the registry entry should be active.
 */
export function isClassicEditorFeatureEnabled(
  feature: string | undefined,
  features: ClassicEditorResolvedFeatures
): boolean {
  return feature === undefined || features[feature] === true;
}
