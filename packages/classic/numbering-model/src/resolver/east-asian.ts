const chineseDigits = ["○", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
const chineseLegalDigits = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"] as const;
const japaneseDigits = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const positionalLimit = 1_000_000;

/**
 * Formats the audited short Chinese counting sequence.
 *
 * Values below one hundred use the ordinary tens form. Larger values follow
 * the producer-compatible digit-by-digit form.
 *
 * @param value - Positive integer counter.
 * @returns Chinese counting text.
 */
export function formatChineseCounting(value: number): string {
  if (value < 10) return chineseDigits[value] ?? String(value);
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${tens === 1 ? "" : chineseDigits[tens]}十${
      ones === 0 ? "" : chineseDigits[ones]
    }`;
  }
  return String(value)
    .split("")
    .map((digit) => chineseDigits[Number(digit)] ?? digit)
    .join("");
}

/**
 * Formats a Chinese positional counter with zero-gap markers.
 *
 * @param value - Positive integer counter.
 * @returns Chinese positional text or decimal fallback above the admitted range.
 */
export function formatChineseCountingThousand(value: number): string {
  if (value >= positionalLimit) return "";
  return formatPositionalCounter(
    value,
    chineseDigits,
    ["", "十", "百", "千"],
    "万",
    "○",
    (digit, position, hasOutput) =>
      value < 20 && digit === 1 && position === 1 && !hasOutput
  );
}

/**
 * Formats a simplified Chinese legal counter.
 *
 * @param value - Positive integer counter.
 * @returns Legal Chinese text or decimal fallback above the admitted range.
 */
export function formatChineseLegalSimplified(value: number): string {
  if (value >= positionalLimit) return "";
  return formatPositionalCounter(
    value,
    chineseLegalDigits,
    ["", "拾", "佰", "仟"],
    "萬",
    "零",
    () => false
  );
}

/**
 * Formats a Japanese positional counter without zero placeholders.
 *
 * @param value - Positive integer counter.
 * @returns Japanese counting text or decimal fallback above the admitted range.
 */
export function formatJapaneseCounting(value: number): string {
  if (value >= positionalLimit) return "";
  const high = Math.floor(value / 10_000);
  const low = value % 10_000;
  return `${high === 0 ? "" : `${formatJapaneseGroup(high)}万`}${
    low === 0 ? "" : formatJapaneseGroup(low)
  }`;
}

/**
 * Formats one Earthly Branch counter without cycling beyond the glyph range.
 *
 * @param value - Positive integer counter.
 * @returns Earthly Branch glyph for 1–12, otherwise decimal text.
 */
export function formatIdeographZodiac(value: number): string {
  return earthlyBranches[value - 1] ?? String(value);
}

/**
 * Formats a positional counter split into ten-thousand sections.
 *
 * @param value - Positive counter below one million.
 * @param digits - Script-specific zero-through-nine glyphs.
 * @param units - Ones-through-thousands unit glyphs.
 * @param tenThousand - Ten-thousand unit glyph.
 * @param zero - Internal zero-gap glyph.
 * @param omitDigit - Predicate for omitting a leading one before a unit.
 * @returns Formatted positional text.
 */
function formatPositionalCounter(
  value: number,
  digits: readonly string[],
  units: readonly string[],
  tenThousand: string,
  zero: string,
  omitDigit: (
    digit: number,
    position: number,
    hasOutput: boolean
  ) => boolean
): string {
  const high = Math.floor(value / 10_000);
  const low = value % 10_000;
  const highText = high === 0
    ? ""
    : `${formatPositionalGroup(high, digits, units, zero, omitDigit)}${tenThousand}`;
  const lowPrefix = high > 0 && low > 0 && low < 1000 ? zero : "";
  const lowText = low === 0
    ? ""
    : formatPositionalGroup(low, digits, units, zero, omitDigit);
  return `${highText}${lowPrefix}${lowText}`;
}

/**
 * Formats one zero-to-9999 positional section.
 *
 * @param value - Section value.
 * @param digits - Script-specific zero-through-nine glyphs.
 * @param units - Ones-through-thousands unit glyphs.
 * @param zero - Internal zero-gap glyph.
 * @param omitDigit - Predicate for omitting a leading one before a unit.
 * @returns Formatted section.
 */
function formatPositionalGroup(
  value: number,
  digits: readonly string[],
  units: readonly string[],
  zero: string,
  omitDigit: (
    digit: number,
    position: number,
    hasOutput: boolean
  ) => boolean
): string {
  let output = "";
  let pendingZero = false;
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position;
    const digit = Math.floor(value / divisor) % 10;
    if (digit === 0) {
      if (output !== "" && value % divisor !== 0) pendingZero = true;
      continue;
    }
    if (pendingZero) output += zero;
    if (!omitDigit(digit, position, output !== "")) {
      output += digits[digit] ?? String(digit);
    }
    output += units[position] ?? "";
    pendingZero = false;
  }
  return output;
}

/**
 * Formats one Japanese zero-to-9999 section.
 *
 * @param value - Section value.
 * @returns Japanese positional section.
 */
function formatJapaneseGroup(value: number): string {
  let output = "";
  const units = ["", "十", "百", "千"] as const;
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position;
    const digit = Math.floor(value / divisor) % 10;
    if (digit === 0) continue;
    if (!(digit === 1 && position > 0)) {
      output += japaneseDigits[digit] ?? String(digit);
    }
    output += units[position] ?? "";
  }
  return output;
}
