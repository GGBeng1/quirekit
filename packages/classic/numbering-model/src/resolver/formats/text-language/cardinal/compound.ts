const turkishUnits = [
  "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"
] as const;
const turkishTens = [
  "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen",
  "doksan"
] as const;
const italianUnits = [
  "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto",
  "nove", "dieci", "undici", "dodici", "tredici", "quattordici",
  "quindici", "sedici", "diciassette", "diciotto", "diciannove"
] as const;
const italianTens = [
  "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta",
  "ottanta", "novanta"
] as const;
const slovakUnits = [
  "jeden", "dva", "tri", "štyri", "päť", "šesť", "sedem", "osem",
  "deväť", "desať", "jedenásť", "dvanásť", "trinásť", "štrnásť",
  "pätnásť", "šestnásť", "sedemnásť", "osemnásť", "devätnásť"
] as const;
const slovakTens = [
  "dvadsať", "tridsať", "štyridsať", "päťdesiat", "šesťdesiat",
  "sedemdesiat", "osemdesiat", "deväťdesiat"
] as const;

/**
 * Formats one Turkish cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound Turkish cardinal.
 */
export function formatTurkishCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    if (thousands >= 100) {
      parts.push(formatTurkishCardinal(thousands));
    } else if (thousands !== 1) {
      parts.push(formatTurkishUnderHundred(thousands));
    }
    parts.push("bin");
  }
  const hundreds = Math.floor(remainder / 100);
  if (hundreds > 0) {
    if (hundreds !== 1) parts.push(formatTurkishUnderHundred(hundreds));
    parts.push("yüz");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) parts.push(formatTurkishUnderHundred(underHundred));
  return parts.join("");
}

/**
 * Formats one Turkish value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Turkish lexical compound.
 */
function formatTurkishUnderHundred(value: number): string {
  const ten = Math.floor(value / 10);
  const unit = value % 10;
  return `${ten > 0 ? turkishTens[ten - 1] ?? "" : ""}${
    unit > 0 ? turkishUnits[unit - 1] ?? "" : ""
  }`;
}

/**
 * Formats one Italian cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound Italian cardinal.
 */
export function formatItalianCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    if (thousands >= 100) {
      parts.push(formatItalianCardinal(thousands));
    } else if (thousands !== 1) {
      parts.push(formatItalianUnderHundred(thousands));
    }
    parts.push(thousands === 1 ? "mille" : "mila");
  }
  const hundreds = Math.floor(remainder / 100);
  if (hundreds > 0) {
    if (hundreds !== 1) parts.push(formatItalianUnderHundred(hundreds));
    parts.push("cento");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) {
    const word = formatItalianUnderHundred(underHundred);
    parts.push(underHundred > 20 && underHundred % 10 === 3
      ? `${word.slice(0, -3)}tré`
      : word);
  }
  return parts.join("");
}

/**
 * Formats one Italian value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Italian lexical compound.
 */
function formatItalianUnderHundred(value: number): string {
  if (value < 20) return italianUnits[value - 1] ?? "";
  const unit = value % 10;
  const baseTen = italianTens[Math.floor(value / 10) - 2] ?? "";
  const ten = unit === 1 || unit === 8 ? baseTen.slice(0, -1) : baseTen;
  return unit === 0 ? ten : `${ten}${italianUnits[unit - 1] ?? ""}`;
}

/**
 * Formats one Slovak cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound Slovak cardinal.
 */
export function formatSlovakCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    parts.push(
      thousands >= 100
        ? formatSlovakCardinal(thousands)
        : formatSlovakUnderHundred(thousands),
      "tisíc"
    );
  }
  const hundreds = Math.floor(remainder / 100);
  if (hundreds > 0) {
    if (hundreds !== 1) {
      parts.push(hundreds === 2 ? "dve" : formatSlovakUnderHundred(hundreds));
    }
    parts.push("sto");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) parts.push(formatSlovakUnderHundred(underHundred));
  return parts.join("");
}

/**
 * Formats one Slovak value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Slovak lexical compound.
 */
function formatSlovakUnderHundred(value: number): string {
  if (value < 20) return slovakUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = slovakTens[Math.floor(value / 10) - 2] ?? "";
  return unit === 0 ? ten : `${ten}${slovakUnits[unit - 1] ?? ""}`;
}
