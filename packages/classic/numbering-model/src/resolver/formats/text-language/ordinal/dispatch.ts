import { formatEnglishOrdinalText } from "../../english-words";
import { sentenceCaseText } from "../language";

import { formatBulgarianOrdinal } from "./bulgarian";
import { formatCzechOrdinal } from "./czech";
import { formatEastSlavicOrdinal } from "./east-slavic";
import { formatGreekOrdinal } from "./greek";
import { formatLatvianOrdinal } from "./latvian";
import { formatSerbianOrdinal } from "./serbian";
import {
  formatBasqueOrdinal,
  formatDutchOrdinal,
  formatFrenchOrdinal,
  formatGermanOrdinal,
  formatItalianOrdinal,
  formatSwedishOrdinal,
  formatTurkishOrdinal
} from "./simple";
import { formatSlovakOrdinal } from "./slovak";
import {
  formatPortugueseOrdinal,
  formatSpanishOrdinal
} from "./structured";

/**
 * Formats one language-aware Word ordinal text counter.
 *
 * @param value - Positive counter.
 * @param language - Effective numbering-marker language.
 * @returns Sentence-case ordinal marker text.
 */
export function formatWordOrdinalText(
  value: number,
  language: string
): string {
  if (value >= 1_000_000) return "";
  const lower = formatNativeOrdinal(value, language);
  return lower === undefined
    ? formatEnglishOrdinalText(value)
    : sentenceCaseText(lower, language);
}

/**
 * Dispatches native ordinal programs without changing case.
 *
 * @param value - Positive counter below one million.
 * @param language - Effective numbering-marker language.
 * @returns Native lower-case text, or undefined for English-rule paths.
 */
function formatNativeOrdinal(
  value: number,
  language: string
): string | undefined {
  switch (language) {
    case "bg-BG":
      return formatBulgarianOrdinal(value);
    case "cs-CZ":
      return formatCzechOrdinal(value);
    case "de-DE":
      return formatGermanOrdinal(value);
    case "el-GR":
      return formatGreekOrdinal(value);
    case "es-ES":
      return formatSpanishOrdinal(value);
    case "eu-ES":
      return formatBasqueOrdinal(value);
    case "fr-FR":
      return formatFrenchOrdinal(value);
    case "it-IT":
      return formatItalianOrdinal(value);
    case "lv-LV":
      return formatLatvianOrdinal(value);
    case "nl-NL":
      return formatDutchOrdinal(value);
    case "pl-PL":
    case "ru-RU":
    case "uk-UA":
      return formatEastSlavicOrdinal(value, language);
    case "pt-BR":
    case "pt-PT":
      return formatPortugueseOrdinal(value);
    case "sk-SK":
      return formatSlovakOrdinal(value);
    case "sr-Cyrl-RS":
    case "sr-Latn-RS":
      return formatSerbianOrdinal(value, language);
    case "sv-SE":
      return formatSwedishOrdinal(value);
    case "tr-TR":
      return formatTurkishOrdinal(value);
    default:
      return undefined;
  }
}
