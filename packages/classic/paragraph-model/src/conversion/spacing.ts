import {
  createWordParagraphDxaMeasurement
} from "../model";
import type {
  WordParagraphFormatting,
  WordParagraphLineSpacing,
  WordParagraphLineSpacingRule
} from "../types";

const supportedLineRules = new Set<WordParagraphLineSpacingRule>([
  "auto",
  "exact",
  "atLeast"
]);

/**
 * Projects producer-shaped LitAST paragraph spacing into canonical Word state.
 *
 * @param value - Candidate LitAST `spacing` record.
 * @returns Canonical before, after, and line spacing.
 */
export function litAstParagraphSpacingToWord(
  value: unknown
): WordParagraphFormatting["spacing"] {
  const spacing = readRecord(value);
  if (spacing === undefined) {
    return {
      before: null,
      beforeLines: null,
      beforeAutoSpacing: null,
      after: null,
      afterLines: null,
      afterAutoSpacing: null,
      line: null
    };
  }
  return {
    before: readDxaSpacing(spacing.before),
    beforeLines: readLineUnitSpacing(spacing.beforeLines),
    beforeAutoSpacing: readNullableBoolean(spacing.beforeAutospacing),
    after: readDxaSpacing(spacing.after),
    afterLines: readLineUnitSpacing(spacing.afterLines),
    afterAutoSpacing: readNullableBoolean(spacing.afterAutospacing),
    line: readLineSpacing(spacing.line, spacing.lineRule)
  };
}

/**
 * Writes canonical paragraph spacing while retaining untouched producer shape.
 *
 * @param target - Mutable LitAST paragraph attrs copied from preserved source.
 * @param spacing - Current canonical paragraph spacing.
 * @param snapshot - Canonical spacing captured with preserved source attrs.
 */
export function writeWordParagraphSpacingToLitAst(
  target: Record<string, unknown>,
  spacing: WordParagraphFormatting["spacing"],
  snapshot: WordParagraphFormatting["spacing"] | null | undefined
): void {
  if (snapshot !== undefined && equalSpacing(spacing, snapshot)) return;
  const serialized: Record<string, unknown> = {};
  if (spacing.before !== null) serialized.before = spacing.before.value;
  if (spacing.beforeLines !== null) serialized.beforeLines = spacing.beforeLines;
  if (spacing.beforeAutoSpacing !== null) {
    serialized.beforeAutospacing = spacing.beforeAutoSpacing;
  }
  if (spacing.after !== null) serialized.after = spacing.after.value;
  if (spacing.afterLines !== null) serialized.afterLines = spacing.afterLines;
  if (spacing.afterAutoSpacing !== null) {
    serialized.afterAutospacing = spacing.afterAutoSpacing;
  }
  if (spacing.line !== null) {
    serialized.line = spacing.line.value;
    serialized.lineRule = spacing.line.rule;
  }
  if (Object.keys(serialized).length === 0) delete target.spacing;
  else target.spacing = serialized;
}

/**
 * Reads one non-negative twip paragraph distance.
 *
 * @param value - Candidate LitAST numeric value.
 * @returns Canonical twip measurement or null.
 */
function readDxaSpacing(
  value: unknown
): WordParagraphFormatting["spacing"]["before"] {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? createWordParagraphDxaMeasurement(value)
    : null;
}

/**
 * Reads one non-negative paragraph distance in hundredths of a line.
 *
 * @param value - Candidate LitAST numeric value.
 * @returns Canonical line-unit value or null.
 */
function readLineUnitSpacing(value: unknown): number | null {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= 0
    ? Math.round(value)
    : null;
}

/**
 * Reads one optional OOXML on/off value already normalized by LitAST.
 *
 * @param value - Candidate LitAST boolean value.
 * @returns Explicit boolean or inherited null.
 */
function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Reads line spacing with OOXML's rule-dependent unit contract.
 *
 * A missing rule follows WordprocessingML's `auto` default. Invalid values
 * remain available through source preservation but do not enter canonical
 * layout state.
 *
 * @param value - Candidate positive line value.
 * @param rule - Candidate OOXML line rule.
 * @returns Canonical typed line spacing or null.
 */
function readLineSpacing(
  value: unknown,
  rule: unknown
): WordParagraphLineSpacing | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const normalizedRule = typeof rule === "string" && supportedLineRules.has(
    rule as WordParagraphLineSpacingRule
  )
    ? rule as WordParagraphLineSpacingRule
    : "auto";
  return { rule: normalizedRule, value: Math.round(value) };
}

/**
 * Compares canonical spacing snapshots by their typed scalar fields.
 *
 * @param left - Current paragraph spacing.
 * @param right - Imported paragraph spacing snapshot.
 * @returns Whether both values are canonically equal.
 */
function equalSpacing(
  left: WordParagraphFormatting["spacing"],
  right: WordParagraphFormatting["spacing"] | null
): boolean {
  return right !== null
    && JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Reads a non-array object before producer-field access.
 *
 * @param value - Candidate object.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
