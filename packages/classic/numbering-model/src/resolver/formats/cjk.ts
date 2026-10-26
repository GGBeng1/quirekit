import type { WordNumberingCounterFormat } from "../../types";
import {
  formatFourDegreeCounter,
  koreanDigits
} from "./cjk/positional";
import {
  formatNativeKorean,
  formatTraditionalLegal
} from "./cjk/legal";
import {
  formatTaiwaneseDigitalCounting,
  formatTaiwanesePositional
} from "./cjk/taiwanese";

const japaneseLegalDigits = Array.from("壱弐参四伍六七八九");

/**
 * Formats one CJK positional, legal, or counting counter.
 *
 * @param format - CJK OOXML numbering format.
 * @param value - Positive counter value.
 * @returns Visible CJK counter text.
 */
export function formatCjkCounter(
  format: WordNumberingCounterFormat,
  value: number
): string {
  switch (format) {
    case "ideographLegalTraditional":
      return value < 1_000_000 ? formatTraditionalLegal(value) : "";
    case "japaneseLegal":
      return formatFourDegreeCounter(
        value,
        japaneseLegalDigits,
        ["萬", "阡", "百", "拾"],
        true,
        Number.POSITIVE_INFINITY
      );
    case "koreanCounting":
      return formatFourDegreeCounter(
        value,
        koreanDigits,
        ["만", "천", "백", "십"],
        false,
        1_000_000
      );
    case "koreanLegal":
      return value < 100
        ? formatNativeKorean(value)
        : formatFourDegreeCounter(
            value,
            koreanDigits,
            ["만", "천", "백", "십"],
            false,
            Number.POSITIVE_INFINITY
          );
    case "taiwaneseCounting":
      return formatTaiwaneseDigitalCounting(value);
    case "taiwaneseCountingThousand":
      return value < 1_000_000 ? formatTaiwanesePositional(value) : "";
    default:
      throw new RangeError(`Numbering format ${format} is not a CJK format.`);
  }
}
