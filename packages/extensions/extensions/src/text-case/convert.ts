import type { TextCaseMode, TextCaseUnit } from "./types";

const wordChar = /[\p{L}\p{N}\p{M}'’]/u;
const letter = /\p{L}/u;
const sentenceEnd = /[.!?。！？]/u;
const sentenceTrail = /[\s"'”’)\]）」』]/u;

/**
 * Maps one character between halfwidth and fullwidth forms.
 *
 * Covers printable ASCII (U+0021–007E ↔ U+FF01–FF5E), the space (U+0020 ↔
 * U+3000) and the U+FFE0–FFE6 currency and sign block.
 *
 * @param char - Source character.
 * @param mode - Target width.
 * @returns Mapped character, or the source when no mapping exists.
 */
export function mapTextWidth(char: string, mode: "halfwidth" | "fullwidth"): string {
  const code = char.codePointAt(0)!;
  const signs: readonly [number, number][] = [[0xffe0, 0xa2], [0xffe1, 0xa3], [0xffe2, 0xac], [0xffe3, 0xaf], [0xffe4, 0xa6], [0xffe5, 0xa5], [0xffe6, 0x20a9]];
  if (mode === "halfwidth") {
    if (code >= 0xff01 && code <= 0xff5e) return String.fromCodePoint(code - 0xfee0);
    if (code === 0x3000) return " ";
    const sign = signs.find(([full]) => full === code);
    return sign === undefined ? char : String.fromCodePoint(sign[1]);
  }
  if (code >= 0x21 && code <= 0x7e) return String.fromCodePoint(code + 0xfee0);
  if (code === 0x20) return "　";
  const sign = signs.find(([, half]) => half === code);
  return sign === undefined ? char : String.fromCodePoint(sign[0]);
}

/**
 * Computes the rewritten character for every unit of one textblock.
 *
 * Word and sentence starts are decided on the whole textblock so a partial
 * selection keeps its surrounding context; separator units end words.
 *
 * @param units - Textblock characters in order.
 * @param mode - Requested rewrite.
 * @returns Target characters aligned with `units`.
 */
export function convertTextCaseUnits(units: readonly TextCaseUnit[], mode: TextCaseMode): string[] {
  let previousWord = false;
  let sentenceStart = true;
  // A Latin full stop starts a sentence only once whitespace follows; CJK marks always do.
  let afterEnd: "latin" | "cjk" | null = null;
  let sawSpace = false;
  return units.map(({ char, pos }) => {
    const separator = pos < 0 || /\s/u.test(char);
    const isWord = !separator && wordChar.test(char);
    const wordStart = isWord && !previousWord;
    previousWord = isWord;
    switch (mode) {
      case "lower": return char.toLowerCase();
      case "upper": return char.toUpperCase();
      case "toggle": return char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
      case "halfwidth":
      case "fullwidth": return mapTextWidth(char, mode);
      case "capitalize": return wordStart ? char.toUpperCase() : char.toLowerCase();
      case "sentence": {
        if (afterEnd !== null) {
          if (separator) sawSpace = true;
          else if (!sentenceTrail.test(char) && !sentenceEnd.test(char)) {
            sentenceStart = afterEnd === "cjk" || sawSpace;
            afterEnd = null;
            sawSpace = false;
          }
        }
        if (sentenceEnd.test(char)) afterEnd = /[。！？]/u.test(char) ? "cjk" : "latin";
        if (!isWord) return char;
        const upper = sentenceStart && letter.test(char);
        sentenceStart = false;
        return upper ? char.toUpperCase() : char.toLowerCase();
      }
    }
  });
}
