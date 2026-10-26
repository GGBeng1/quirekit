import type { WordSortKeyType, WordSortValue } from "./types";

/** English month names and abbreviations, January as 1. */
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Reads the value Word sorts by from a cell or paragraph text.
 *
 * Numbers must start the text (after spaces and an optional sign); dates are
 * read in the common Chinese and English forms. Text without a value of the
 * key type yields null, which sorts before every value.
 *
 * @param text - Cell or paragraph text.
 * @param type - Key type.
 * @returns Parsed value, or null.
 */
export function readWordSortValue(text: string, type: WordSortKeyType): WordSortValue {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (type === "text") return trimmed;
  return type === "number" ? readNumber(trimmed) : readDate(trimmed);
}

/** @param text - Trimmed text. @returns Leading number, or null. */
function readNumber(text: string): number | null {
  const match = /^([+-]?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/u.exec(text);
  if (match === null) return null;
  const value = Number(`${match[1]}${match[2]!.replaceAll(",", "")}${match[3] ?? ""}`);
  return Number.isFinite(value) ? value : null;
}

/** @param text - Trimmed text. @returns Day number since the epoch, or null. */
function readDate(text: string): number | null {
  let match = /^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/u.exec(text);
  if (match !== null) return dayNumber(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/u.exec(text);
  if (match !== null) return dayNumber(Number(match[3]), Number(match[1]), Number(match[2]));
  match = /^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/iu.exec(text);
  if (match !== null) return dayNumber(Number(match[3]), monthIndex(match[1]!), Number(match[2]));
  match = /^(\d{1,2})\s+([a-z]{3,9})\.?,?\s+(\d{4})/iu.exec(text);
  if (match !== null) return dayNumber(Number(match[3]), monthIndex(match[2]!), Number(match[1]));
  return null;
}

/** @param name - English month name. @returns Month number, or 0 when unknown. */
function monthIndex(name: string): number {
  return months.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

/**
 * @param year - Four-digit year.
 * @param month - Month 1–12.
 * @param day - Day of month.
 * @returns Days since 1970-01-01, or null for an impossible date.
 */
function dayNumber(year: number, month: number, day: number): number | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const time = Date.UTC(year, month - 1, day);
  return new Date(time).getUTCDate() === day ? time / 86400000 : null;
}
