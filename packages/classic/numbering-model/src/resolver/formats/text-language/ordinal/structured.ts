import { formatPortugueseCardinal } from "../cardinal/portuguese";

import { replaceLexicalPhrases } from "./phrase-replacements";
const portugueseOrdinals: Readonly<Record<string, string>> = {
  um: "primeiro",
  dois: "segundo",
  três: "terceiro",
  quatro: "quarto",
  cinco: "quinto",
  seis: "sexto",
  sete: "sétimo",
  oito: "oitavo",
  nove: "nono",
  dez: "décimo",
  onze: "décimo primeiro",
  doze: "décimo segundo",
  treze: "décimo terceiro",
  quartorze: "décimo quarto",
  quinze: "décimo quinto",
  dezesseis: "décimo sexto",
  dezessete: "décimo sétimo",
  dezoito: "décimo oitavo",
  dezenove: "décimo nono",
  vinte: "vigésimo",
  trinta: "trigésimo",
  quarenta: "quadragésimo",
  cinqüenta: "qüinquagésimo",
  sessenta: "sexagésimo",
  setenta: "setuagésimo",
  oitenta: "octogésimo",
  noventa: "nonagésimo",
  cem: "centésimo",
  cento: "centésimo",
  duzentos: "ducentésimo",
  trezentos: "trecentésimo",
  quatrocentos: "quadringentésimo",
  quinhentos: "qüingentésimo",
  seiscentos: "seiscentésimo",
  setecentos: "setingentésimo",
  oitocentos: "octingentésimo",
  novecentos: "nongentésimo"
};
const spanishUnitOrdinals = [
  "primero", "segundo", "tercero", "cuarto", "quinto", "sexto", "séptimo",
  "octavo", "noveno", "décimo", "undécimo", "duodécimo", "decimotercero",
  "decimocuarto", "decimoquinto", "decimosexto", "decimoséptimo",
  "decimoctavo", "decimonoveno"
] as const;
const spanishTensOrdinals = [
  "vigésimo", "trigésimo", "cuadragésimo", "quincuagésimo",
  "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo"
] as const;
const spanishHundredOrdinals = [
  "centésimo", "ducentésimo", "tricentésimo", "cuadringentésimo",
  "quingentésimo", "sexcentésimo", "septingentésimo", "octingentésimo",
  "noningentésimo"
] as const;
const spanishCardinalHundreds = [
  "cien", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos"
] as const;

/**
 * Formats one Portuguese ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Portuguese ordinal text.
 */
export function formatPortugueseOrdinal(value: number): string {
  const cardinal = formatPortugueseCardinal(value);
  const tokens = cardinal.split(" ");
  const thousandIndex = tokens.indexOf("mil");
  if (thousandIndex < 0) return ordinalizePortuguese(cardinal);
  const coefficient = tokens.slice(0, thousandIndex).join(" ");
  const remainder = tokens.slice(thousandIndex + 1).join(" ");
  return [
    coefficient,
    value >= 2_000 ? "milésimos" : "milésimo",
    ordinalizePortuguese(remainder)
  ].filter(Boolean).join(" ");
}

/**
 * Converts every recognized Portuguese component and removes conjunctions.
 *
 * @param value - Cardinal fragment.
 * @returns Ordinal fragment.
 */
function ordinalizePortuguese(value: string): string {
  return replaceLexicalPhrases(value, portugueseOrdinals)
    .split(" ")
    .filter((token) => token !== "e")
    .join(" ");
}

/**
 * Formats one Spanish ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Spanish ordinal text.
 */
export function formatSpanishOrdinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands === 0) return formatSpanishOrdinalUnderThousand(remainder);
  return [
    formatSpanishThousandCoefficient(thousands),
    value >= 2_000 ? "milésimos" : "milésimo",
    remainder > 0 ? formatSpanishOrdinalUnderThousand(remainder) : ""
  ].filter(Boolean).join(" ");
}

/**
 * Formats a Spanish ordinal value below one thousand.
 *
 * @param value - Value from one through 999.
 * @returns Lower-case ordinal components.
 */
function formatSpanishOrdinalUnderThousand(value: number): string {
  const hundredDigit = Math.floor(value / 100);
  const underHundred = value % 100;
  return [
    hundredDigit > 0 ? spanishHundredOrdinals[hundredDigit - 1] ?? "" : "",
    underHundred > 0 ? formatSpanishOrdinalUnderHundred(underHundred) : ""
  ].filter(Boolean).join(" ");
}

/**
 * Formats a Spanish ordinal value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case ordinal components in the mature component order.
 */
function formatSpanishOrdinalUnderHundred(value: number): string {
  if (value < 20) return spanishUnitOrdinals[value - 1] ?? "";
  const unit = value % 10;
  const ten = spanishTensOrdinals[Math.floor(value / 10) - 2] ?? "";
  return unit === 0
    ? ten
    : `${spanishUnitOrdinals[unit - 1] ?? ""} ${ten}`;
}

/**
 * Formats the coefficient before a Spanish ordinal thousand noun.
 *
 * @param value - Thousand coefficient from one through 999.
 * @returns Mixed cardinal-hundred and ordinal-remainder coefficient.
 */
function formatSpanishThousandCoefficient(value: number): string {
  if (value === 1) return "";
  if (value < 100) return formatSpanishOrdinalUnderHundred(value);
  const hundredDigit = Math.floor(value / 100);
  const underHundred = value % 100;
  return [
    spanishCardinalHundreds[hundredDigit - 1] ?? "",
    underHundred > 0 ? formatSpanishOrdinalUnderHundred(underHundred) : ""
  ].filter(Boolean).join(" ");
}
