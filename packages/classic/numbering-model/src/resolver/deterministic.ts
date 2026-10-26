import type { WordNumberingCounterFormat } from "../types";

const heavenlyStems = [
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸"
] as const;
const earthlyBranches = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥"
] as const;

/**
 * Formats one counter from the deterministic migration batch.
 *
 * @param format - Deterministic format selected by the canonical level.
 * @param value - Positive integer counter value.
 * @returns Visible marker component.
 */
export function formatDeterministicWordNumberingCounter(
  format: WordNumberingCounterFormat,
  value: number
): string {
  switch (format) {
    case "decimalEnclosedCircle":
      return formatBoundedCodePoint(value, 20, 0x2460);
    case "decimalEnclosedFullstop":
      return formatBoundedCodePoint(value, 20, 0x2488);
    case "decimalEnclosedParen":
      return formatBoundedCodePoint(value, 20, 0x2474);
    case "decimalFullWidth":
    case "decimalFullWidth2":
      return formatFullWidthDecimal(value);
    case "decimalHalfWidth":
      return String(value);
    case "hex":
      return value <= 0xFFFF ? value.toString(16).toUpperCase() : "";
    case "ideographEnclosedCircle":
      return formatBoundedCodePoint(value, 10, 0x3220);
    case "ideographTraditional":
      return heavenlyStems[value - 1] ?? String(value);
    case "ideographZodiacTraditional":
      return formatSexagenaryCycle(value);
    case "numberInDash":
      return `- ${value} -`;
    case "none":
      return "";
    default:
      throw new RangeError(`Numbering format ${format} is not deterministic-batch data.`);
  }
}

/**
 * Formats one finite consecutive Unicode range with decimal fallback.
 *
 * @param value - Positive integer counter.
 * @param maximum - Inclusive final value represented by the range.
 * @param firstCodePoint - Unicode code point representing one.
 * @returns Unicode symbol inside the range or ASCII decimal outside it.
 */
function formatBoundedCodePoint(
  value: number,
  maximum: number,
  firstCodePoint: number
): string {
  return value <= maximum
    ? String.fromCodePoint(firstCodePoint + value - 1)
    : String(value);
}

/**
 * Maps every ASCII decimal digit to its full-width Unicode counterpart.
 *
 * @param value - Positive integer counter.
 * @returns Full-width decimal text.
 */
function formatFullWidthDecimal(value: number): string {
  return String(value).replace(/\d/gu, (digit) =>
    String.fromCodePoint(0xFF10 + Number(digit))
  );
}

/**
 * Formats the traditional 60-value stem-branch cycle.
 *
 * @param value - Positive integer counter.
 * @returns One Heavenly Stem followed by one Earthly Branch.
 */
function formatSexagenaryCycle(value: number): string {
  const zeroBased = (value - 1) % 60;
  return `${heavenlyStems[zeroBased % heavenlyStems.length]}${
    earthlyBranches[zeroBased % earthlyBranches.length]
  }`;
}
