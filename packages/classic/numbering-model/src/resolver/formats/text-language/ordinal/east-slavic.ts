import { formatInflectedThousandsCardinal } from "../cardinal/slavic";

import {
  type CompoundThousandOrdinalLexicon,
  polishOrdinalLexicon,
  russianOrdinalLexicon,
  ukrainianOrdinalLexicon
} from "./east-slavic-data";

/**
 * Formats one Russian, Ukrainian, or Polish ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @param language - Effective supported language.
 * @returns Lower-case ordinal text.
 */
export function formatEastSlavicOrdinal(
  value: number,
  language: "pl-PL" | "ru-RU" | "uk-UA"
): string {
  const lexicon = selectLexicon(language);
  const tokens = formatInflectedThousandsCardinal(value, language).split(" ");
  const final = tokens[tokens.length - 1] ?? "";
  if (isThousandNoun(final, language, lexicon)) {
    collapseExactThousand(tokens, language, lexicon);
  } else {
    tokens[tokens.length - 1] = lexicon.numbers[final] ?? final;
  }
  if (language === "pl-PL") applyPolishTens(tokens, lexicon);
  return tokens.join(" ");
}

/**
 * Selects immutable ordinal lexical material.
 *
 * @param language - Effective supported language.
 * @returns Matching compound-thousand lexicon.
 */
function selectLexicon(
  language: "pl-PL" | "ru-RU" | "uk-UA"
): CompoundThousandOrdinalLexicon {
  if (language === "pl-PL") return polishOrdinalLexicon;
  return language === "ru-RU"
    ? russianOrdinalLexicon
    : ukrainianOrdinalLexicon;
}

/**
 * Tests whether the final cardinal element is an exact thousand noun.
 *
 * @param value - Final cardinal element.
 * @param language - Effective supported language.
 * @param lexicon - Matching lexical material.
 * @returns Whether exact-thousand compounding applies.
 */
function isThousandNoun(
  value: string,
  language: "pl-PL" | "ru-RU" | "uk-UA",
  lexicon: CompoundThousandOrdinalLexicon
): boolean {
  return language === "pl-PL"
    ? value === "tysiąc" || value === "tysiące" || value === "tysięcy"
    : value.includes(lexicon.thousandEntry);
}

/**
 * Collapses the trailing cardinal coefficient into one compound ordinal.
 *
 * @param tokens - Mutable cardinal components.
 * @param language - Effective supported language.
 * @param lexicon - Matching lexical material.
 */
function collapseExactThousand(
  tokens: string[],
  language: "pl-PL" | "ru-RU" | "uk-UA",
  lexicon: CompoundThousandOrdinalLexicon
): void {
  const noun = tokens.pop() ?? "";
  const suffix = language === "pl-PL" && noun === "tysiąc"
    ? "tysiączny"
    : lexicon.thousandOrdinal;
  const compound = [suffix];
  let final = tokens[tokens.length - 1] ?? "";
  if (Object.hasOwn(lexicon.thousandUnits, final)) {
    compound.unshift(lexicon.thousandUnits[final] ?? "");
    tokens.pop();
    final = tokens[tokens.length - 1] ?? "";
    const secondPrefix = lexicon.thousandUnits[final];
    if (secondPrefix) {
      compound.unshift(secondPrefix);
      tokens.pop();
    }
  }
  final = tokens[tokens.length - 1] ?? "";
  const hundredPrefix = lexicon.thousandHundreds[final];
  if (hundredPrefix) {
    tokens.pop();
    compound.unshift(hundredPrefix);
  }
  tokens.push(compound.join(""));
}

/**
 * Applies the mature Polish rule that ordinalizes every visible tens token
 * before a standalone singular-thousand boundary.
 *
 * @param tokens - Mutable ordinal components.
 * @param lexicon - Polish lexical material.
 */
function applyPolishTens(
  tokens: string[],
  lexicon: CompoundThousandOrdinalLexicon
): void {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === "tysiączny") break;
    const replacement = lexicon.tens?.[tokens[index] ?? ""];
    if (replacement) tokens[index] = replacement;
  }
}
