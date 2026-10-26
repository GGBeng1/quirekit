import type { WordParagraphFormatting, WordParagraphFormattingPatch, WordParagraphLineSpacing, WordParagraphMeasurement } from "../types";

/** Paragraph properties written in the AI value notation, shared by paragraph formats and style definitions. */
export type WordParagraphAiValueName = "align" | "lineSpacing" | "spaceBefore" | "spaceAfter" | "indent" | "firstLineIndent";

const lengthPattern = "[0-9]+(\\.[0-9]+)?";

/** Meaning and JSON Schema of each value, the same space the reader returns. */
export const wordParagraphAiValues: Readonly<Record<WordParagraphAiValueName, { readonly description: string; readonly schema: Readonly<Record<string, unknown>> }>> = {
  align: {
    description: "Alignment: \"start\", \"center\", \"end\", \"justify\" or \"distribute\".",
    schema: { enum: ["start", "center", "end", "justify", "distribute"] }
  },
  lineSpacing: {
    description: "Line spacing: a multiple such as 1.5, \"18pt\" exactly, or \">=18pt\" at least.",
    schema: { anyOf: [{ type: "number", exclusiveMinimum: 0, maximum: 10 }, { type: "string", pattern: `^(>=)?${lengthPattern}pt$` }] }
  },
  spaceBefore: { description: "Space before the paragraph, such as \"12pt\" or \"0.5line\".", schema: { type: "string", pattern: `^${lengthPattern}(pt|line)$` } },
  spaceAfter: { description: "Space after the paragraph, such as \"12pt\" or \"0.5line\".", schema: { type: "string", pattern: `^${lengthPattern}(pt|line)$` } },
  indent: { description: "Start indentation, such as \"2char\" or \"21pt\".", schema: { type: "string", pattern: `^${lengthPattern}(pt|char)$` } },
  firstLineIndent: { description: "First-line indentation such as \"2char\"; negative values hang.", schema: { type: "string", pattern: `^-?${lengthPattern}(pt|char)$` } }
};

/**
 * Reads one property in the AI value notation.
 * @param formatting - Resolved paragraph properties.
 * @param name - Value name.
 * @returns Value such as `1.5`, `"12pt"` or `"2char"`, or undefined when inherited.
 */
export function readWordParagraphAiValue(formatting: WordParagraphFormatting, name: WordParagraphAiValueName): unknown {
  switch (name) {
    case "align":
      return formatting.alignment ?? undefined;
    case "lineSpacing": {
      const line = formatting.spacing.line;
      if (line === null) return undefined;
      if (line.rule === "auto") return round(line.value / 240);
      return `${line.rule === "atLeast" ? ">=" : ""}${round(line.value / 20)}pt`;
    }
    case "spaceBefore":
    case "spaceAfter": {
      const side = name === "spaceBefore" ? "before" : "after";
      const lines = side === "before" ? formatting.spacing.beforeLines : formatting.spacing.afterLines;
      return lines !== null ? `${round(lines / 100)}line` : formatMeasurement(formatting.spacing[side]);
    }
    case "indent":
      return formatMeasurement(formatting.indentation.start);
    case "firstLineIndent":
      return formatMeasurement(formatting.indentation.firstLine);
  }
}

/**
 * Builds the properties patch that sets one value; `null` returns the property to inheritance.
 * @param formatting - Resolved properties the patch starts from; spacing and indentation are replaced whole.
 * @param name - Value name.
 * @param value - Schema-valid value, or null.
 * @returns Patch for that property alone.
 */
export function patchWordParagraphAiValue(formatting: WordParagraphFormatting, name: WordParagraphAiValueName, value: unknown): WordParagraphFormattingPatch {
  switch (name) {
    case "align":
      return { alignment: (value ?? null) as WordParagraphFormatting["alignment"] };
    case "lineSpacing":
      return { spacing: { ...formatting.spacing, line: parseLineSpacing(value) } };
    case "spaceBefore":
    case "spaceAfter": {
      const lines = typeof value === "string" && value.endsWith("line") ? Math.round(Number.parseFloat(value) * 100) : null;
      const distance = typeof value === "string" && value.endsWith("pt") ? { unit: "dxa" as const, value: Math.round(Number.parseFloat(value) * 20) } : null;
      return { spacing: name === "spaceBefore"
        ? { ...formatting.spacing, before: distance, beforeLines: lines }
        : { ...formatting.spacing, after: distance, afterLines: lines } };
    }
    case "indent":
      return { indentation: { ...formatting.indentation, start: parseMeasurement(value) } };
    case "firstLineIndent":
      return { indentation: { ...formatting.indentation, firstLine: parseMeasurement(value) } };
  }
}

/** @param value - Number to round. @returns Value rounded to two decimals. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * @param measurement - Twips or hundredths of a character.
 * @returns `"12pt"` or `"2char"`, or undefined when unset.
 */
function formatMeasurement(measurement: WordParagraphMeasurement | null): string | undefined {
  if (measurement === null) return undefined;
  return measurement.unit === "dxa" ? `${round(measurement.value / 20)}pt` : `${round(measurement.value / 100)}char`;
}

/**
 * @param value - `"12pt"` or `"2char"`, or null.
 * @returns Measurement, or null to inherit.
 */
function parseMeasurement(value: unknown): WordParagraphMeasurement | null {
  if (typeof value !== "string") return null;
  const number = Number.parseFloat(value);
  return value.endsWith("char")
    ? { unit: "character", value: Math.round(number * 100) }
    : { unit: "dxa", value: Math.round(number * 20) };
}

/**
 * @param value - A multiple, `"18pt"` exactly or `">=18pt"` at least, or null.
 * @returns Line spacing, or null to inherit.
 */
function parseLineSpacing(value: unknown): WordParagraphLineSpacing | null {
  if (typeof value === "number") return { rule: "auto", value: Math.round(value * 240) };
  if (typeof value !== "string") return null;
  const points = Number.parseFloat(value.replace(">=", ""));
  return { rule: value.startsWith(">=") ? "atLeast" : "exact", value: Math.round(points * 20) };
}
