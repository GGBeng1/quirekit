import { formatBasqueCardinal } from "../../cardinal/basque";
import {
  formatItalianCardinal,
  formatTurkishCardinal
} from "../../cardinal/compound";
import {
  formatDutchCardinal,
  formatGermanCardinal,
  formatSwedishCardinal
} from "../../cardinal/germanic";
import { formatFrenchCardinal } from "../../cardinal/romance";
import {
  dutchOrdinals,
  germanOrdinals,
  swedishOrdinals,
  turkishOrdinals
} from "./data";
import {
  finalDutchSegment,
  finalGermanSegment,
  finalItalianSegment,
  finalSwedishSegment,
  finalTurkishSegment
} from "./segments";

/**
 * Formats one Basque ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Basque ordinal text.
 */
export function formatBasqueOrdinal(value: number): string {
  if (value === 1) return "lehenengo";
  return replaceFinalWord(formatBasqueCardinal(value), (word) => `${word}garren`);
}

/**
 * Formats one Turkish ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Turkish ordinal text.
 */
export function formatTurkishOrdinal(value: number): string {
  const cardinal = formatTurkishCardinal(value);
  const segment = finalTurkishSegment(value);
  return replaceSuffix(cardinal, segment, turkishOrdinals[segment] ?? segment);
}

/**
 * Formats one German ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case German ordinal text.
 */
export function formatGermanOrdinal(value: number): string {
  const cardinal = formatGermanCardinal(value);
  const segment = finalGermanSegment(value);
  return replaceSuffix(
    cardinal,
    segment,
    germanOrdinals[segment] ?? `${segment}ste`
  );
}

/**
 * Formats one French ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case French ordinal text.
 */
export function formatFrenchOrdinal(value: number): string {
  if (value === 1) return "premier";
  let cardinal = formatFrenchCardinal(value);
  const underHundred = value % 100;
  const keepsCompoundNeuf = underHundred === 19
    || underHundred === 79
    || underHundred === 99;
  if (cardinal.endsWith("neuf") && !keepsCompoundNeuf) {
    cardinal = `${cardinal.slice(0, -4)}neuv`;
  }
  else if (cardinal.endsWith("cinq")) cardinal = `${cardinal.slice(0, -4)}cinqu`;
  else if (cardinal.endsWith("cents")) cardinal = cardinal.slice(0, -1);
  if (cardinal.endsWith("e")) cardinal = cardinal.slice(0, -1);
  return `${cardinal}ième`;
}

/**
 * Formats one Italian ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Italian ordinal text.
 */
export function formatItalianOrdinal(value: number): string {
  const cardinal = formatItalianCardinal(value);
  const irregular = [
    "primo", "secondo", "terzo", "quarto", "quinto", "sesto", "settimo",
    "ottavo", "nono", "decimo"
  ] as const;
  if (value <= 10) return irregular[value - 1] ?? "";
  const segment = finalItalianSegment(value);
  if (segment === "tré") return replaceSuffix(cardinal, segment, "treesimo");
  const stem = segment === "sei" ? segment : segment.slice(0, -1);
  const ordinal = `${stem}${segment === "mila" ? "l" : ""}esimo`;
  return replaceSuffix(cardinal, segment, ordinal);
}

/**
 * Formats one Dutch ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Dutch ordinal text.
 */
export function formatDutchOrdinal(value: number): string {
  const cardinal = formatDutchCardinal(value);
  const segment = finalDutchSegment(value);
  const ordinal = dutchOrdinals[segment]
    ?? `${segment}${value < 20 ? "de" : "ste"}`;
  return replaceSuffix(cardinal, segment, ordinal);
}

/**
 * Formats one Swedish ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Swedish ordinal text.
 */
export function formatSwedishOrdinal(value: number): string {
  const cardinal = formatSwedishCardinal(value);
  const segment = finalSwedishSegment(value);
  const ordinal = swedishOrdinals[segment]
    ?? `${segment}${value % 100 < 20 ? "de" : "nde"}`;
  return replaceSuffix(cardinal, segment, ordinal);
}

/**
 * Replaces the final whitespace-delimited word.
 *
 * @param value - Cardinal text.
 * @param transform - Final-word transformation.
 * @returns Transformed text.
 */
function replaceFinalWord(
  value: string,
  transform: (word: string) => string
): string {
  const boundary = value.lastIndexOf(" ");
  const prefix = boundary < 0 ? "" : value.slice(0, boundary + 1);
  const word = boundary < 0 ? value : value.slice(boundary + 1);
  return `${prefix}${transform(word)}`;
}

/**
 * Replaces one known suffix without touching an earlier equal substring.
 *
 * @param value - Complete cardinal text.
 * @param suffix - Expected final lexical segment.
 * @param replacement - Ordinal replacement.
 * @returns Text with the final segment replaced.
 */
function replaceSuffix(
  value: string,
  suffix: string,
  replacement: string
): string {
  return suffix !== "" && value.endsWith(suffix)
    ? `${value.slice(0, -suffix.length)}${replacement}`
    : value;
}
