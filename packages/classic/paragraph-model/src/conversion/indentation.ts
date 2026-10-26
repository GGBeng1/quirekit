import {
  createWordParagraphCharacterMeasurement,
  createWordParagraphDxaMeasurement
} from "../model";
import type {
  WordParagraphFormatting,
  WordParagraphMeasurement
} from "../types";

/**
 * Reads LitAST indentation into logical Word paragraph measurements.
 *
 * @param value - Candidate LitAST indent record.
 * @returns Logical start, end, and signed first-line indentation.
 */
export function litAstIndentationToWord(
  value: unknown
): WordParagraphFormatting["indentation"] {
  const indent = readRecord(value);
  if (indent === undefined) return { start: null, end: null, firstLine: null };
  const start = readMeasurement(indent.leftChars, indent.left);
  const end = readMeasurement(indent.rightChars, indent.right);
  const firstLine = readMeasurement(indent.firstLineChars, indent.firstLine)
    ?? negateMeasurement(readMeasurement(indent.hangingChars, indent.hanging));
  return { start, end, firstLine };
}

/**
 * Writes current logical indentation back to LitAST physical fields.
 *
 * @param target - Mutable paragraph attrs.
 * @param value - Canonical indentation record.
 */
export function writeWordIndentationToLitAst(
  target: Record<string, unknown>,
  value: unknown
): void {
  const indent = wordIndentationToLitAst(value);
  if (indent === undefined) delete target.indent;
  else target.indent = indent;
}

/**
 * Converts canonical indentation into LitAST physical fields.
 *
 * @param value - Canonical indentation record.
 * @returns LitAST indentation or undefined when no measurement is present.
 */
export function wordIndentationToLitAst(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  const indentation = readRecord(value);
  if (indentation === undefined) return undefined;
  const indent: Record<string, unknown> = {};
  writeMeasurement(indent, "left", "leftChars", indentation.start, false);
  writeMeasurement(indent, "right", "rightChars", indentation.end, false);
  const firstLine = readRecord(indentation.firstLine);
  const isHanging = typeof firstLine?.value === "number" && firstLine.value < 0;
  writeMeasurement(
    indent,
    isHanging ? "hanging" : "firstLine",
    isHanging ? "hangingChars" : "firstLineChars",
    firstLine,
    isHanging
  );
  return Object.keys(indent).length === 0 ? undefined : indent;
}

/**
 * Reads character-relative or absolute input into one canonical measurement.
 *
 * @param characterValue - Hundredths-of-character source value.
 * @param dxaValue - Twip source value.
 * @returns Preferred measurement or null.
 */
function readMeasurement(
  characterValue: unknown,
  dxaValue: unknown
): WordParagraphMeasurement | null {
  if (typeof characterValue === "number" && Number.isFinite(characterValue)) {
    return createWordParagraphCharacterMeasurement(characterValue);
  }
  if (typeof dxaValue === "number" && Number.isFinite(dxaValue)) {
    return createWordParagraphDxaMeasurement(dxaValue);
  }
  return null;
}

/**
 * Negates a hanging measurement into the signed first-line convention.
 *
 * @param value - Positive hanging amount.
 * @returns Negative first-line delta or null.
 */
function negateMeasurement(value: WordParagraphMeasurement | null): WordParagraphMeasurement | null {
  return value === null ? null : { ...value, value: -Math.abs(value.value) };
}

/**
 * Writes one canonical measurement to its LitAST unit field.
 *
 * @param target - Mutable indent record.
 * @param dxaKey - Absolute field name.
 * @param characterKey - Character field name.
 * @param value - Candidate measurement.
 * @param absolute - Whether a negative signed value should become positive.
 */
function writeMeasurement(
  target: Record<string, unknown>,
  dxaKey: string,
  characterKey: string,
  value: unknown,
  absolute: boolean
): void {
  const measurement = readRecord(value);
  if (measurement === undefined || typeof measurement.value !== "number") return;
  const amount = absolute ? Math.abs(measurement.value) : measurement.value;
  if (measurement.unit === "character") target[characterKey] = amount;
  if (measurement.unit === "dxa") target[dxaKey] = amount;
}

/**
 * Reads one record without accepting arrays.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
