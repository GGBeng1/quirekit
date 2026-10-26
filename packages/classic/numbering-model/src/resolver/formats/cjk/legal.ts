const traditionalLegalDigits = Array.from("壹貳參肆伍陸柒捌玖");
const koreanOnes = [
  "하나",
  "둘",
  "셋",
  "넷",
  "다섯",
  "여섯",
  "일곱",
  "여덟",
  "아홉"
] as const;
const koreanTens = [
  "열",
  "스물",
  "서른",
  "마흔",
  "쉰",
  "예순",
  "일흔",
  "여든",
  "아흔"
] as const;

/**
 * Formats a traditional legal Chinese positional number.
 *
 * @param value - Positive counter below one million.
 * @returns Traditional legal number.
 */
export function formatTraditionalLegal(value: number): string {
  const high = Math.floor(value / 10_000);
  const low = value % 10_000;
  if (high === 0) {
    return formatTraditionalGroup(low, false);
  }
  return `${formatTraditionalGroup(high, false)}萬${formatTraditionalGroup(
    low,
    true
  )}`;
}

/**
 * Formats Korean native words below one hundred.
 *
 * @param value - Positive counter below one hundred.
 * @returns Native Korean counting words.
 */
export function formatNativeKorean(value: number): string {
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${tens > 0 ? koreanTens[tens - 1] ?? "" : ""}${
    ones > 0 ? koreanOnes[ones - 1] ?? "" : ""
  }`;
}

/**
 * Formats one traditional legal group below ten thousand.
 *
 * @param value - Group value.
 * @param followsTenThousand - Whether the group follows a ten-thousand unit.
 * @returns Legal group text.
 */
function formatTraditionalGroup(
  value: number,
  followsTenThousand: boolean
): string {
  const units = ["", "拾", "佰", "仟"] as const;
  let output = "";
  let gap = false;
  for (let position = 3; position >= 0; position -= 1) {
    const divisor = 10 ** position;
    const digit = Math.floor(value / divisor) % 10;
    if (digit === 0) {
      if (output !== "" && value % divisor !== 0) gap = true;
      continue;
    }
    if ((gap || (followsTenThousand && output === "" && position < 2))) {
      output += "零";
    }
    output += `${traditionalLegalDigits[digit - 1] ?? digit}${units[position]}`;
    gap = false;
  }
  return output;
}
