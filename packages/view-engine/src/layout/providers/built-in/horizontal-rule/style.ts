import type {
  BuiltInHorizontalRuleAlignment,
  BuiltInHorizontalRuleStyle,
  BuiltInHorizontalRuleVariant
} from "./types";

/** View-owned fallback matching the public horizontal-rule schema defaults. */
const builtInHorizontalRuleDefaultStyle: BuiltInHorizontalRuleStyle = {
  variant: "single",
  color: "#111827",
  thicknessPt: 1.5,
  widthPercent: 100,
  alignment: "center"
};

/**
 * Validates persisted horizontal-rule attributes at the View boundary.
 *
 * The View intentionally reads the public node contract structurally instead
 * of importing the StarterKit extension. This keeps the built-in rendering
 * path independent from schema assembly while preserving deterministic
 * fallback for imported or legacy documents.
 *
 * @param value - Opaque ProseMirror node attributes.
 * @returns Complete style safe for layout and paint.
 */
export function resolveBuiltInHorizontalRuleStyle(
  value: Readonly<Record<string, unknown>>
): BuiltInHorizontalRuleStyle {
  return {
    variant: readVariant(value.variant),
    color: readColor(value.color),
    thicknessPt: clampNumber(value.thicknessPt, 0.25, 24, 1.5),
    widthPercent: clampNumber(value.widthPercent, 1, 100, 100),
    alignment: readAlignment(value.alignment)
  };
}

/**
 * Reads one supported visual family.
 *
 * @param value - Candidate persisted value.
 * @returns Supported family or the visible default.
 */
function readVariant(value: unknown): BuiltInHorizontalRuleVariant {
  return value === "single"
    || value === "double"
    || value === "dotted"
    || value === "dashed"
    || value === "shaded"
    ? value
    : builtInHorizontalRuleDefaultStyle.variant;
}

/**
 * Reads one supported inline alignment.
 *
 * @param value - Candidate persisted value.
 * @returns Supported alignment or the centered default.
 */
function readAlignment(value: unknown): BuiltInHorizontalRuleAlignment {
  return value === "left" || value === "center" || value === "right"
    ? value
    : builtInHorizontalRuleDefaultStyle.alignment;
}

/**
 * Reads one non-empty CSS-compatible color token.
 *
 * @param value - Candidate persisted value.
 * @returns Trimmed color or the visible default.
 */
function readColor(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : builtInHorizontalRuleDefaultStyle.color;
}

/**
 * Converts and clamps one numeric style field.
 *
 * @param value - Candidate persisted value.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @param fallback - Value used for invalid input.
 * @returns Finite value inside the public contract.
 */
function clampNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
}
