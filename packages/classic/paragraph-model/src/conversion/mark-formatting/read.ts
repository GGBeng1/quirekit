import type { WordParagraphMarkFormatting } from "../../types";
import { isMark, isRecord, readString, readBoolean, readPointSize } from "./values";

/**
 * Converts paragraph-mark LitAST marks into the canonical Word subset.
 *
 * @param value - Candidate `paragraphMarkMarks` array.
 * @returns Canonical paragraph-mark formatting or null when no field is direct.
 */
export function litAstParagraphMarkFormattingToWord(
  value: unknown
): WordParagraphMarkFormatting | null {
  if (!Array.isArray(value)) return null;
  const marks = value.filter(isMark);
  const textStyle = marks.find((mark) => mark.type === "textStyle")?.attrs ?? {};
  const result: WordParagraphMarkFormatting = {
    fontFamily: readString(textStyle.fontFamily),
    fontSizePt: readPointSize(textStyle.fontSize),
    bold: marks.some((mark) => mark.type === "bold")
      ? true
      : readBoolean(textStyle.bold),
    italic: marks.some((mark) => mark.type === "italic")
      ? true
      : readBoolean(textStyle.italic),
    color: readString(textStyle.color),
    underline: marks.some((mark) => mark.type === "underline") ? true : null,
    strike: marks.some((mark) => mark.type === "strike") ? true : null
  };
  return Object.values(result).some((field) => field !== null) ? result : null;
}

/**
 * Sanitizes paragraph-mark formatting stored in editor JSON.
 *
 * @param value - Candidate canonical mark formatting.
 * @returns Sanitized mark formatting or null.
 */
export function resolveWordParagraphMarkFormatting(
  value: unknown
): WordParagraphMarkFormatting | null {
  if (!isRecord(value)) return null;
  const result: WordParagraphMarkFormatting = {
    fontFamily: readString(value.fontFamily),
    fontSizePt: typeof value.fontSizePt === "number"
      && Number.isFinite(value.fontSizePt)
      && value.fontSizePt > 0
      ? value.fontSizePt
      : null,
    bold: readBoolean(value.bold),
    italic: readBoolean(value.italic),
    color: readString(value.color),
    underline: readBoolean(value.underline),
    strike: readBoolean(value.strike)
  };
  return Object.values(result).some((field) => field !== null) ? result : null;
}
