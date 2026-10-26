const smallCardinals = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen"
] as const;
const tensCardinals = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety"
] as const;
const irregularOrdinals: Readonly<Record<string, string>> = {
  one: "first",
  two: "second",
  three: "third",
  five: "fifth",
  eight: "eighth",
  nine: "ninth",
  twelve: "twelfth"
};

/**
 * Formats an English cardinal number in the mature numbering range.
 *
 * @param value - Positive counter value.
 * @returns Sentence-case English cardinal text, or empty text above the range.
 */
export function formatEnglishCardinal(value: number): string {
  if (value >= 1_000_000) return "";
  return sentenceCase(formatEnglishCardinalLower(value));
}

/**
 * Formats an English ordinal word in the mature numbering range.
 *
 * @param value - Positive counter value.
 * @returns Sentence-case English ordinal text, or empty text above the range.
 */
export function formatEnglishOrdinalText(value: number): string {
  const cardinal = formatEnglishCardinalLower(value);
  if (cardinal === "") return "";
  const separator = Math.max(cardinal.lastIndexOf(" "), cardinal.lastIndexOf("-"));
  const prefix = separator < 0 ? "" : cardinal.slice(0, separator + 1);
  const finalWord = separator < 0 ? cardinal : cardinal.slice(separator + 1);
  const ordinal = irregularOrdinals[finalWord]
    ?? (finalWord.endsWith("y")
      ? `${finalWord.slice(0, -1)}ieth`
      : `${finalWord}th`);
  return sentenceCase(`${prefix}${ordinal}`);
}

/**
 * Formats a lower-case English cardinal number.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case cardinal text.
 */
function formatEnglishCardinalLower(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const groups: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    groups.push(formatBelowThousand(thousands), "thousand");
  }
  if (remainder > 0) groups.push(formatBelowThousand(remainder));
  return groups.join(" ");
}

/**
 * Formats a positive English value below one thousand.
 *
 * @param value - Value from one through 999.
 * @returns Lower-case English text.
 */
function formatBelowThousand(value: number): string {
  const groups: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds > 0) {
    groups.push(smallCardinals[hundreds] ?? String(hundreds), "hundred");
  }
  if (remainder > 0) groups.push(formatBelowHundred(remainder));
  return groups.join(" ");
}

/**
 * Formats a positive English value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case English text.
 */
function formatBelowHundred(value: number): string {
  if (value < 20) return smallCardinals[value] ?? String(value);
  const tens = tensCardinals[Math.floor(value / 10)] ?? "";
  const ones = value % 10;
  return ones === 0 ? tens : `${tens}-${smallCardinals[ones]}`;
}

/**
 * Converts the first character of a non-empty word sequence to upper case.
 *
 * @param value - Lower-case word sequence.
 * @returns Sentence-case word sequence.
 */
function sentenceCase(value: string): string {
  return value === "" ? "" : `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}
