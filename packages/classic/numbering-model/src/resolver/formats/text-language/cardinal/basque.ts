const units = [
  "bat", "bi", "hiru", "lau", "bost", "sei", "zazpi", "zortzi",
  "bederatzi", "hamar", "hamaika", "hamabi", "hamairu", "hamalau",
  "hamabost", "hamasei", "hamazazpi", "hemezortzi", "hemeretzi"
] as const;
const twenties = ["hogei", "berrogei", "hirurogei", "laurogei"] as const;
const hundreds = [
  "ehun", "berrehun", "hirurehun", "laurehun", "bostehun", "seiehun",
  "zazpiehun", "zortziehun", "bederatziehun"
] as const;

/**
 * Formats one Basque cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Basque cardinal text.
 */
export function formatBasqueCardinal(value: number): string {
  return splitBasque(value, false).join(" ");
}

/**
 * Splits a Basque value into thousand, hundred, and remainder phases.
 *
 * @param value - Positive counter below one million.
 * @param suppressConjunction - Whether a recursive thousand coefficient omits
 * the lower-group conjunction.
 * @returns Ordered lexical components.
 */
function splitBasque(value: number, suppressConjunction: boolean): string[] {
  if (value <= 0 || value >= 1_000_000) return [];
  const result: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    if (thousands >= 100) {
      result.push(...splitBasque(thousands, true));
    } else if (thousands !== 1) {
      result.push(...formatBasqueUnderHundred(thousands));
    }
    result.push("mila");
  }
  const hundredDigit = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (hundredDigit > 0) result.push(hundreds[hundredDigit - 1] ?? "");
  if (underHundred > 0) {
    if ((hundredDigit > 0 || thousands > 0) && !suppressConjunction) {
      result.push("eta");
    }
    result.push(...formatBasqueUnderHundred(underHundred));
  }
  return result;
}

/**
 * Formats one Basque value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns One vigesimal lexical group.
 */
function formatBasqueUnderHundred(value: number): string[] {
  const score = Math.floor(value / 20);
  const remainder = value % 20;
  if (score === 0) return [units[remainder - 1] ?? ""];
  const base = twenties[score - 1] ?? "";
  return remainder === 0
    ? [base]
    : [`${base}ta`, units[remainder - 1] ?? ""];
}
