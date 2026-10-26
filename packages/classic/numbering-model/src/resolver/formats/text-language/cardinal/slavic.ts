import type { InflectedThousandsLexicon } from "../types";

import { inflectedThousandsLexicons } from "./slavic-data";

/**
 * Formats one cardinal with a space-separated inflected-thousands program.
 *
 * @param value - Positive counter below one million.
 * @param language - Effective language with a registered lexicon.
 * @returns Lower-case cardinal text.
 */
export function formatInflectedThousandsCardinal(
  value: number,
  language: string
): string {
  const lexicon = inflectedThousandsLexicons[language];
  if (!lexicon) return "";
  return splitInflectedThousands(value, lexicon, lexicon.omitSingleOne)
    .join(" ");
}

/**
 * Splits one bounded value into inflected thousand, hundred, and remainder
 * phases.
 *
 * @param value - Positive counter below one million.
 * @param lexicon - Language lexical material.
 * @param omitSingleOne - Whether the current thousand group suppresses one.
 * @returns Ordered lexical components.
 */
function splitInflectedThousands(
  value: number,
  lexicon: InflectedThousandsLexicon,
  omitSingleOne: boolean
): string[] {
  if (value <= 0 || value >= 1_000_000) return [];
  const result: string[] = [];
  const thousandGroup = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousandGroup > 0) {
    result.push(...formatThousandGroup(
      thousandGroup,
      lexicon,
      omitSingleOne
    ));
  }
  const hundreds = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (hundreds > 0) {
    result.push(
      hundreds === 1 && underHundred > 0 && lexicon.linkedHundred
        ? lexicon.linkedHundred
        : lexicon.hundreds[hundreds - 1] ?? ""
    );
  }
  if (underHundred > 0) {
    result.push(...formatUnderHundred(underHundred, lexicon));
  }
  return result.filter(Boolean);
}

/**
 * Formats the coefficient and inflected noun for one thousand group.
 *
 * @param value - Thousand coefficient from one through 999.
 * @param lexicon - Language lexical material.
 * @param omitSingleOne - Whether exactly one omits its coefficient.
 * @returns Coefficient followed by its thousand noun.
 */
function formatThousandGroup(
  value: number,
  lexicon: InflectedThousandsLexicon,
  omitSingleOne: boolean
): string[] {
  const coefficient = value >= 100
    ? splitInflectedThousands(value, lexicon, false)
    : formatUnderHundred(value, lexicon);
  if (value === 4 && lexicon.thousandFour) {
    coefficient.splice(0, coefficient.length, lexicon.thousandFour);
  }

  const finalDigit = value % 10;
  let noun = lexicon.thousands[2];
  if (finalDigit === 1) {
    noun = lexicon.thousands[0];
    if (omitSingleOne && value === 1) {
      coefficient.pop();
    } else {
      coefficient[coefficient.length - 1] = lexicon.thousandUnits[0];
    }
  } else if (finalDigit >= 2 && finalDigit <= 4) {
    noun = lexicon.thousands[1];
    if (finalDigit === 2) {
      coefficient[coefficient.length - 1] = lexicon.thousandUnits[1];
    }
  }
  coefficient.push(noun);
  return coefficient;
}

/**
 * Formats one positive value below one hundred as lexical components.
 *
 * @param value - Value from one through 99.
 * @param lexicon - Language lexical material.
 * @returns One unit/teen or a tens-plus-unit pair.
 */
function formatUnderHundred(
  value: number,
  lexicon: InflectedThousandsLexicon
): string[] {
  if (value < 20) return [lexicon.units[value - 1] ?? ""];
  const tens = lexicon.tens[Math.floor(value / 10) - 2] ?? "";
  const unit = value % 10;
  return unit === 0
    ? [tens]
    : [tens, lexicon.units[unit - 1] ?? ""];
}
