import type { WordNumberingCounterFormat } from "../../types";

const aiueoHalfWidth = Array.from(
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ"
);
const aiueoFullWidth = Array.from(
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン"
);
const irohaHalfWidth = Array.from(
  "ｲﾛﾊﾆﾎﾍﾄﾁﾘﾇﾙｦﾜｶﾖﾀﾚｿﾂﾈﾅﾗﾑｳヰﾉｵｸﾔﾏｹﾌｺｴﾃｱｻｷﾕﾒﾐｼヱﾋﾓｾｽﾝ"
);
const irohaFullWidth = Array.from(
  "イロハニホヘトチリヌルヲワカヨタレソツネナラムウヰノオクヤマケフコエテアサキユメミシヱヒモセスン"
);
const arabicAbjad = Array.from("أبجدهوزحطيكلمنسعفصقرشتثخذضظغ");
const arabicAlpha = Array.from("أبتثجحخدذرزسشصضطظعغفقكلمنهوي");
const chicagoSymbols = ["*", "†", "‡", "§"] as const;
const koreanChosung = Array.from("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ");
const koreanGanada = Array.from("가나다라마바사아자차카타파하");
const hebrewAlphabet = Array.from("אבגדהוזחטיכלמנסעפצקרשת");
const hindiVowelSequence = [
  ..."अआइईउऊऋऌऍऎएऐऑऒओऔ",
  "अं",
  "अः"
] as const;
const russianAlphabet = Array.from("абвгдежзиклмнопрстуфхцчшщыэюя");
const thaiAlphabet = Array.from(
  "กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ"
);

/**
 * Formats a fixed-alphabet or repeated-symbol numbering sequence.
 *
 * @param format - Sequence-based OOXML numbering format.
 * @param value - Positive counter value.
 * @returns Visible sequence marker.
 */
export function formatSequenceCounter(
  format: WordNumberingCounterFormat,
  value: number
): string {
  switch (format) {
    case "aiueo":
      return formatSingleCycle(value, aiueoHalfWidth);
    case "aiueoFullWidth":
      return formatSingleCycle(value, aiueoFullWidth);
    case "arabicAbjad":
      return formatRepeatedSequence(value, arabicAbjad, 392);
    case "arabicAlpha":
      return formatRepeatedSequence(value, arabicAlpha, 392);
    case "chicago":
      return formatRepeatedSequence(value, chicagoSymbols, 120);
    case "chosung":
      return formatSingleCycle(value, koreanChosung);
    case "ganada":
      return formatSingleCycle(value, koreanGanada);
    case "hebrew1":
      return formatHebrewNumeral(value);
    case "hebrew2":
      return formatHebrewRepeated(value);
    case "hindiConsonants":
      return formatRepeatedSequence(value, hindiVowelSequence, 304);
    case "hindiVowels":
      return formatHindiConsonantSequence(value);
    case "iroha":
      return formatSingleCycle(value, irohaHalfWidth);
    case "irohaFullWidth":
      return formatSingleCycle(value, irohaFullWidth);
    case "russianLower":
      return formatRepeatedSequence(value, russianAlphabet, 870);
    case "russianUpper":
      return formatRepeatedSequence(
        value,
        russianAlphabet.map((letter) => letter.toUpperCase()),
        870
      );
    case "thaiLetters":
      return formatRepeatedSequence(value, thaiAlphabet, 1230);
    default:
      throw new RangeError(`Numbering format ${format} is not a sequence format.`);
  }
}

/**
 * Selects one symbol from a finite cyclic alphabet.
 *
 * @param value - Positive counter.
 * @param alphabet - Ordered visible symbols.
 * @returns Selected symbol.
 */
function formatSingleCycle(
  value: number,
  alphabet: readonly string[]
): string {
  return alphabet[(value - 1) % alphabet.length] ?? String(value);
}

/**
 * Repeats one alphabet symbol as the counter crosses alphabet-sized groups.
 *
 * @param value - Positive counter.
 * @param alphabet - Ordered visible symbols.
 * @param bound - Finite mature-runtime cycle bound.
 * @returns Repeated symbol marker.
 */
function formatRepeatedSequence(
  value: number,
  alphabet: readonly string[],
  bound: number
): string {
  const normalized = ((value - 1) % bound) + 1;
  const zeroBased = normalized - 1;
  const symbol = alphabet[zeroBased % alphabet.length] ?? "";
  return symbol.repeat(Math.floor(zeroBased / alphabet.length) + 1);
}

/**
 * Formats Hebrew numeric letters with the conventional fifteen/sixteen forms.
 *
 * @param value - Positive counter.
 * @returns Hebrew numeric marker inside the 392-value cycle.
 */
function formatHebrewNumeral(value: number): string {
  let normalized = ((value - 1) % 392) + 1;
  let result = "";
  const lastTwoDigits = normalized % 100;
  if (lastTwoDigits === 15 || lastTwoDigits === 16) {
    normalized -= lastTwoDigits;
    result = lastTwoDigits === 15 ? "וט" : "זט";
  }
  const groups = [
    [1, "אבגדהוזחט"],
    [10, "יכלמנסעפצ"],
    [100, "קרשתךםןףץ"],
    [1000, "אבגדהוזחט"]
  ] as const;
  for (const [degree, symbols] of groups) {
    const digit = Math.floor(normalized / degree) % 10;
    if (digit > 0) result += Array.from(symbols)[digit - 1] ?? "";
  }
  return result;
}

/**
 * Formats the repeated Hebrew alphabet sequence with trailing tav characters.
 *
 * @param value - Positive counter.
 * @returns Hebrew repeated-sequence marker.
 */
function formatHebrewRepeated(value: number): string {
  const normalized = ((value - 1) % 392) + 1;
  const zeroBased = normalized - 1;
  const symbol = hebrewAlphabet[zeroBased % hebrewAlphabet.length] ?? "";
  return `${symbol}${"ת".repeat(Math.floor(zeroBased / hebrewAlphabet.length))}`;
}

/**
 * Formats the OOXML Hindi-vowels lexical value using the observed consonant run.
 *
 * @param value - Positive counter.
 * @returns Repeated Devanagari consonant.
 */
function formatHindiConsonantSequence(value: number): string {
  const normalized = ((value - 1) % 304) + 1;
  const zeroBased = normalized - 1;
  return String.fromCodePoint(0x0915 + (zeroBased % 37))
    .repeat(Math.floor(zeroBased / 37) + 1);
}
