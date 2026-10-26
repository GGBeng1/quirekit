/** One-through-nine Korean digit glyphs. */
export const koreanDigits = Array.from("일이삼사오육칠팔구");

/**
 * Formats Japanese or Korean four-degree positional numbering.
 *
 * @param value - Positive counter.
 * @param digits - One-through-nine glyphs.
 * @param degrees - Ten-thousand through tens unit glyphs.
 * @param includeOneBeforeDegree - Whether a one is visible before units.
 * @param upperBound - Exclusive supported upper boundary.
 * @returns Positional number or empty text beyond the boundary.
 */
export function formatFourDegreeCounter(
  value: number,
  digits: readonly string[],
  degrees: readonly [string, string, string, string],
  includeOneBeforeDegree: boolean,
  upperBound: number
): string {
  if (value >= upperBound) return "";
  const high = Math.floor(value / 10_000);
  const low = value % 10_000;
  if (high === 0) {
    return formatFourDegreeGroup(
      low,
      digits,
      degrees,
      includeOneBeforeDegree
    );
  }
  const highText = high === 1 && !includeOneBeforeDegree
    ? ""
    : formatFourDegreeGroup(
        high,
        digits,
        degrees,
        includeOneBeforeDegree
      );
  return `${highText}${degrees[0]}${formatFourDegreeGroup(
    low,
    digits,
    degrees,
    includeOneBeforeDegree
  )}`;
}

/**
 * Formats one positional group through the ten-thousand degree.
 *
 * @param value - Positive group value.
 * @param digits - One-through-nine glyphs.
 * @param degrees - Ten-thousand through tens unit glyphs.
 * @param includeOneBeforeDegree - Whether a one is visible before units.
 * @returns Positional group.
 */
function formatFourDegreeGroup(
  value: number,
  digits: readonly string[],
  degrees: readonly [string, string, string, string],
  includeOneBeforeDegree: boolean
): string {
  let output = "";
  const divisors = [10_000, 1_000, 100, 10] as const;
  for (let index = 0; index < divisors.length; index += 1) {
    const divisor = divisors[index] ?? 1;
    const count = Math.floor(value / divisor);
    if (count > 0) {
      if (count !== 1 || includeOneBeforeDegree) {
        output += digits[count - 1] ?? String(count);
      }
      output += degrees[index] ?? "";
      value %= divisor;
    }
  }
  return value > 0 ? `${output}${digits[value - 1] ?? value}` : output;
}
