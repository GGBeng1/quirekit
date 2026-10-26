const ordinaryDigits = Array.from("一二三四五六七八九");

/**
 * Formats the Taiwanese short counting rule.
 *
 * @param value - Positive counter.
 * @returns Taiwanese counting text.
 */
export function formatTaiwaneseDigitalCounting(value: number): string {
  if (value >= 100) {
    return String(value).replace(/\d/gu, (digit) =>
      `○一二三四五六七八九`[Number(digit)] ?? digit
    );
  }
  if (value < 10) return ordinaryDigits[value - 1] ?? String(value);
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${tens === 1 ? "" : ordinaryDigits[tens - 1]}十${
    ones === 0 ? "" : ordinaryDigits[ones - 1]
  }`;
}

/**
 * Formats the Taiwanese positional rule below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Taiwanese positional text.
 */
export function formatTaiwanesePositional(value: number): string {
  const high = Math.floor(value / 10_000);
  const low = value % 10_000;
  const highText = high === 0
    ? ""
    : `${formatTaiwaneseGroup(high, true)}萬`;
  const gap = high > 0 && low > 0 && low < 1_000 ? "零" : "";
  return `${highText}${gap}${
    low === 0 ? "" : formatTaiwaneseGroup(low, value > 100)
  }`;
}

/**
 * Formats one Taiwanese positional group below ten thousand.
 *
 * @param value - Positive group value.
 * @param includeLeadingOneBeforeTen - Whether a leading one before ten is visible.
 * @returns Taiwanese positional group.
 */
function formatTaiwaneseGroup(
  value: number,
  includeLeadingOneBeforeTen: boolean
): string {
  const units = ["", "十", "百", "千"] as const;
  let output = "";
  let pendingZero = false;
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position;
    const digit = Math.floor(value / divisor) % 10;
    if (digit === 0) {
      if (output !== "" && value % divisor !== 0) pendingZero = true;
      continue;
    }
    if (pendingZero) output += "零";
    if (!(digit === 1 && position === 1 && !includeLeadingOneBeforeTen)) {
      output += ordinaryDigits[digit - 1] ?? digit;
    }
    output += units[position] ?? "";
    pendingZero = false;
  }
  return output;
}
