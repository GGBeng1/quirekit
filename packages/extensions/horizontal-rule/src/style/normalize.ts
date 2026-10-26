import type {
  HorizontalRuleAlignment,
  HorizontalRuleStyle,
  HorizontalRuleStyleInput,
  HorizontalRuleVariant
} from "../types";
import { defaultHorizontalRuleStyle } from "./defaults";

/**
 * Normalizes persisted or command-supplied attributes into the canonical style.
 *
 * @param value - Untrusted partial node attributes.
 * @param fallback - Complete extension-owned fallback style.
 * @returns Complete validated horizontal-rule style.
 */
export function normalizeHorizontalRuleStyle(
  value: Readonly<Record<string, unknown>> | HorizontalRuleStyleInput | undefined,
  fallback: HorizontalRuleStyle = defaultHorizontalRuleStyle
): HorizontalRuleStyle {
  return {
    variant: readVariant(value?.variant, fallback.variant),
    color: readColor(value?.color, fallback.color),
    thicknessPt: clampNumber(value?.thicknessPt, fallback.thicknessPt, 0.25, 24),
    widthPercent: clampNumber(value?.widthPercent, fallback.widthPercent, 1, 100),
    alignment: readAlignment(value?.alignment, fallback.alignment)
  };
}

/**
 * Validates one variant value.
 *
 * @param value - Candidate value.
 * @param fallback - Canonical fallback.
 * @returns Supported variant.
 */
function readVariant(
  value: unknown,
  fallback: HorizontalRuleVariant
): HorizontalRuleVariant {
  return value === "single"
    || value === "double"
    || value === "dotted"
    || value === "dashed"
    || value === "shaded"
    ? value
    : fallback;
}

/**
 * Validates one alignment value.
 *
 * @param value - Candidate value.
 * @param fallback - Canonical fallback.
 * @returns Supported alignment.
 */
function readAlignment(
  value: unknown,
  fallback: HorizontalRuleAlignment
): HorizontalRuleAlignment {
  return value === "left" || value === "center" || value === "right"
    ? value
    : fallback;
}

/**
 * Normalizes one CSS color.
 *
 * @param value - Candidate color.
 * @param fallback - Canonical fallback.
 * @returns Safe CSS-compatible color.
 */
function readColor(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

/**
 * Clamps one numeric field to its public contract.
 *
 * @param value - Candidate number.
 * @param fallback - Canonical fallback.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @returns Finite clamped number.
 */
function clampNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
}
