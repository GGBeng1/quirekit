import type { WordParagraphAlignment } from "../types";

/**
 * Normalizes a heading level to the supported one-to-six range.
 *
 * @param value - Candidate heading level.
 * @returns Valid heading level.
 */
export function readHeadingLevel(value: unknown): number {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 1
    && value <= 6
    ? value
    : 1;
}

/**
 * Reads a direct zero-based Word outline level.
 *
 * @param value - Candidate LitAST outline level.
 * @returns Level from zero through eight, body sentinel nine, or null.
 */
export function readOutlineLevel(value: unknown): number | null {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 0
    && value <= 9
    ? value
    : null;
}

/**
 * Reads a nullable OOXML on/off value from LitAST.
 *
 * @param value - Candidate boolean field.
 * @returns Explicit boolean or null when inherited or absent.
 */
export function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Converts physical LitAST alignment into the logical paragraph model.
 *
 * @param value - Candidate LitAST alignment.
 * @returns Logical alignment or null when inherited or unknown.
 */
export function readParagraphAlignment(
  value: unknown
): WordParagraphAlignment | null {
  if (value === "left" || value === "start") return "start";
  if (value === "right" || value === "end") return "end";
  if (value === "center") return "center";
  if (value === "justify") return "justify";
  if (value === "distribute") return "distribute";
  return null;
}

/**
 * Converts logical alignment back to the LitAST value space.
 *
 * @param value - Canonical logical alignment.
 * @returns LitAST alignment or null when inherited.
 */
export function writeParagraphAlignment(
  value: WordParagraphAlignment | null
): string | null {
  if (value === "start") return "left";
  if (value === "end") return "right";
  return value;
}

/**
 * Writes one modeled LitAST field or removes it when inherited.
 *
 * @param result - Mutable LitAST paragraph attributes.
 * @param key - LitAST field name.
 * @param value - Canonical value or null for inheritance.
 */
export function writeNullableField(
  result: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  if (value === null || value === undefined) {
    delete result[key];
  } else {
    result[key] = value;
  }
}

/**
 * Reads one non-array record.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
export function readRecord(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
