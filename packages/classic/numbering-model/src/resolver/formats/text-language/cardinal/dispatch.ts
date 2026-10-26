import { formatEnglishCardinal } from "../../english-words";
import { sentenceCaseText } from "../language";

import { formatBasqueCardinal } from "./basque";
import { formatBulgarianCardinal } from "./bulgarian";
import {
  formatItalianCardinal,
  formatSlovakCardinal,
  formatTurkishCardinal
} from "./compound";
import {
  formatDutchCardinal,
  formatGermanCardinal,
  formatSwedishCardinal
} from "./germanic";
import {
  formatFrenchCardinal,
  formatSpanishCardinal
} from "./romance";
import { formatPortugueseCardinal } from "./portuguese";
import { formatInflectedThousandsCardinal } from "./slavic";

/**
 * Formats one language-aware Word cardinal text counter.
 *
 * @param value - Positive counter.
 * @param language - Effective numbering-marker language.
 * @returns Sentence-case cardinal marker text.
 */
export function formatWordCardinalText(
  value: number,
  language: string
): string {
  if (value >= 1_000_000) return "";
  const lower = formatNativeCardinal(value, language);
  return lower === undefined
    ? formatEnglishCardinal(value)
    : sentenceCaseText(lower, language);
}

/**
 * Dispatches native cardinal programs without changing case.
 *
 * @param value - Positive counter below one million.
 * @param language - Effective numbering-marker language.
 * @returns Native lower-case text, or undefined for English-rule paths.
 */
function formatNativeCardinal(
  value: number,
  language: string
): string | undefined {
  switch (language) {
    case "bg-BG":
      return formatBulgarianCardinal(value);
    case "cs-CZ":
    case "el-GR":
    case "lv-LV":
    case "pl-PL":
    case "ru-RU":
    case "sr-Cyrl-RS":
    case "sr-Latn-RS":
    case "uk-UA":
      return formatInflectedThousandsCardinal(value, language);
    case "de-DE":
      return formatGermanCardinal(value);
    case "es-ES":
      return formatSpanishCardinal(value);
    case "eu-ES":
      return formatBasqueCardinal(value);
    case "fr-FR":
      return formatFrenchCardinal(value);
    case "it-IT":
      return formatItalianCardinal(value);
    case "nl-NL":
      return formatDutchCardinal(value);
    case "pt-BR":
    case "pt-PT":
      return formatPortugueseCardinal(value);
    case "sk-SK":
      return formatSlovakCardinal(value);
    case "sv-SE":
      return formatSwedishCardinal(value);
    case "tr-TR":
      return formatTurkishCardinal(value);
    default:
      return undefined;
  }
}
