import {
  circleWordBulletPresetId, decimalDotWordOrderedPresetId, decimalRightParenWordOrderedPresetId, diamondWordBulletPresetId,
  discWordBulletPresetId, enclosedCircleWordOrderedPresetId, lowerLetterDotWordOrderedPresetId, lowerRomanDotWordOrderedPresetId,
  parenthesizedDecimalWordOrderedPresetId, parenthesizedLetterWordOrderedPresetId, squareWordBulletPresetId,
  upperLetterDotWordOrderedPresetId, upperRomanDotWordOrderedPresetId
} from "../presets/builtins/ids";
import type { WordNumberingFormat, WordNumberingLevel } from "../types";

/** One marker pattern the model names by its first marker, such as "1." or "一、". */
export interface WordListAiStyle {
  /** Marker family. */
  readonly kind: "bullet" | "number";
  /** Counter format. */
  readonly format: WordNumberingFormat;
  /** Marker text with `%1` for the level's own counter. */
  readonly text: string;
  /** Built-in preset with exactly this marker, or the id given to a template built on the decimal preset. */
  readonly presetId: string;
  /** Whether `presetId` names a built-in preset rather than a template. */
  readonly builtin: boolean;
}

/** Marker patterns by the first marker they produce. */
export const wordListAiStyles: Readonly<Record<string, WordListAiStyle>> = {
  "1.": { kind: "number", format: "decimal", text: "%1.", presetId: decimalDotWordOrderedPresetId, builtin: true },
  "1)": { kind: "number", format: "decimal", text: "%1)", presetId: decimalRightParenWordOrderedPresetId, builtin: true },
  "(1)": { kind: "number", format: "decimal", text: "(%1)", presetId: parenthesizedDecimalWordOrderedPresetId, builtin: true },
  "（1）": { kind: "number", format: "decimal", text: "（%1）", presetId: "quire-ai.ordered.decimal-fullwidth-paren", builtin: false },
  "1、": { kind: "number", format: "decimal", text: "%1、", presetId: "quire-ai.ordered.decimal-comma", builtin: false },
  "a.": { kind: "number", format: "lowerLetter", text: "%1.", presetId: lowerLetterDotWordOrderedPresetId, builtin: true },
  "a)": { kind: "number", format: "lowerLetter", text: "%1)", presetId: "quire-ai.ordered.lower-letter-paren", builtin: false },
  "(a)": { kind: "number", format: "lowerLetter", text: "(%1)", presetId: parenthesizedLetterWordOrderedPresetId, builtin: true },
  "A.": { kind: "number", format: "upperLetter", text: "%1.", presetId: upperLetterDotWordOrderedPresetId, builtin: true },
  "i.": { kind: "number", format: "lowerRoman", text: "%1.", presetId: lowerRomanDotWordOrderedPresetId, builtin: true },
  "I.": { kind: "number", format: "upperRoman", text: "%1.", presetId: upperRomanDotWordOrderedPresetId, builtin: true },
  "①": { kind: "number", format: "decimalEnclosedCircleChinese", text: "%1", presetId: enclosedCircleWordOrderedPresetId, builtin: true },
  "一、": { kind: "number", format: "chineseCounting", text: "%1、", presetId: "quire-ai.ordered.chinese-comma", builtin: false },
  "（一）": { kind: "number", format: "chineseCounting", text: "（%1）", presetId: "quire-ai.ordered.chinese-fullwidth-paren", builtin: false },
  "•": { kind: "bullet", format: "bullet", text: "•", presetId: discWordBulletPresetId, builtin: true },
  "◦": { kind: "bullet", format: "bullet", text: "◦", presetId: circleWordBulletPresetId, builtin: true },
  "▪": { kind: "bullet", format: "bullet", text: "▪", presetId: squareWordBulletPresetId, builtin: true },
  "◆": { kind: "bullet", format: "bullet", text: "◆", presetId: diamondWordBulletPresetId, builtin: true }
};

/**
 * Names the marker pattern of one level.
 * @param level - Effective numbering level.
 * @returns Style name such as "1." or "•", or undefined for patterns outside the named set,
 * such as multi-level "1.1." markers.
 */
export function readWordListAiStyle(level: WordNumberingLevel): string | undefined {
  const own = new RegExp(`%${level.level + 1}(?![0-9])`, "gu");
  if (level.format !== "bullet" && /%[1-9]/u.test(level.text.replace(own, ""))) return undefined;
  const text = level.format === "bullet" ? level.text : level.text.replace(own, "%1");
  return Object.entries(wordListAiStyles).find(([, style]) => style.format === level.format && style.text === text)?.[0];
}
