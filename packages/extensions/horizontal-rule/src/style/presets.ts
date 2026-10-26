import type {
  HorizontalRulePreset,
  HorizontalRuleStyleInput
} from "../types";
import { normalizeHorizontalRuleStyle } from "./normalize";

/** Atomic horizontal-rule presets shared by UI surfaces and commands. */
export const horizontalRulePresets: readonly HorizontalRulePreset[] = Object.freeze([
  createPreset("thin", "Thin line", { thicknessPt: 0.75 }),
  createPreset("standard", "Standard line", {}),
  createPreset("thick", "Thick line", { thicknessPt: 3 }),
  createPreset("double", "Double line", { variant: "double", thicknessPt: 3 }),
  createPreset("dotted", "Dotted line", { variant: "dotted", thicknessPt: 1.5 }),
  createPreset("dashed", "Dashed line", { variant: "dashed", thicknessPt: 1.5 }),
  createPreset("shaded", "Shaded line", { variant: "shaded", thicknessPt: 4.5 })
]);

/**
 * Creates one immutable built-in preset.
 *
 * @param id - Stable preset id.
 * @param label - Fallback visible label.
 * @param style - Fields overriding the canonical default.
 * @returns Complete preset.
 */
function createPreset(
  id: string,
  label: string,
  style: HorizontalRuleStyleInput
): HorizontalRulePreset {
  return Object.freeze({
    id,
    label,
    style: Object.freeze(normalizeHorizontalRuleStyle(style))
  });
}
