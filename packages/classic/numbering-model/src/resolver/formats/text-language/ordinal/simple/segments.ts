/**
 * Identifies the last Turkish lexical segment.
 *
 * @param value - Positive counter below one million.
 * @returns Final cardinal segment.
 */
export function finalTurkishSegment(value: number): string {
  const underHundred = value % 100;
  if (underHundred > 0) {
    const units = [
      "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"
    ] as const;
    const tens = [
      "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş",
      "seksen", "doksan"
    ] as const;
    const unit = underHundred % 10;
    return unit > 0
      ? units[unit - 1] ?? ""
      : tens[Math.floor(underHundred / 10) - 1] ?? "";
  }
  return value % 1_000 > 0 ? "yüz" : "bin";
}

/**
 * Identifies the last German lexical segment.
 *
 * @param value - Positive counter below one million.
 * @returns Final cardinal segment.
 */
export function finalGermanSegment(value: number): string {
  const underHundred = value % 100;
  if (underHundred > 0) {
    if (underHundred < 20) return germanUnderTwenty(underHundred);
    return [
      "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig",
      "achtzig", "neunzig"
    ][Math.floor(underHundred / 10) - 2] ?? "";
  }
  return value % 1_000 > 0 ? "hundert" : "tausend";
}

/**
 * Returns a German cardinal unit or teen used by the ordinal suffix rule.
 *
 * @param value - Value from one through nineteen.
 * @returns German cardinal word.
 */
function germanUnderTwenty(value: number): string {
  return [
    "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht",
    "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn",
    "sechzehn", "siebzehn", "achtzehn", "neunzehn"
  ][value - 1] ?? "";
}

/**
 * Identifies the last Italian lexical segment.
 *
 * @param value - Positive counter below one million.
 * @returns Final cardinal segment.
 */
export function finalItalianSegment(value: number): string {
  const underHundred = value % 100;
  if (underHundred > 0) {
    const units = [
      "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto",
      "nove", "dieci"
    ] as const;
    if (underHundred < 20) {
      return [
        ...units, "undici", "dodici", "tredici", "quattordici", "quindici",
        "sedici", "diciassette", "diciotto", "diciannove"
      ][underHundred - 1] ?? "";
    }
    const unit = underHundred % 10;
    if (unit > 0) return unit === 3 ? "tré" : units[unit - 1] ?? "";
    return [
      "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta",
      "ottanta", "novanta"
    ][Math.floor(underHundred / 10) - 2] ?? "";
  }
  if (value % 1_000 > 0) return "cento";
  return Math.floor(value / 1_000) === 1 ? "mille" : "mila";
}

/**
 * Identifies the last Dutch lexical segment.
 *
 * @param value - Positive counter below one million.
 * @returns Final cardinal segment.
 */
export function finalDutchSegment(value: number): string {
  const underHundred = value % 100;
  if (underHundred > 0) {
    if (underHundred < 20) {
      return [
        "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht",
        "negen", "tien", "elf", "twaalf", "dertien", "veertien",
        "vijftien", "zestien", "zeventien", "achttien", "negentien"
      ][underHundred - 1] ?? "";
    }
    return [
      "twintig", "dertig", "veertig", "vijftig", "zestig", "zeventig",
      "tachtig", "negentig"
    ][Math.floor(underHundred / 10) - 2] ?? "";
  }
  return value % 1_000 > 0 ? "honderd" : "duizend";
}

/**
 * Identifies the last Swedish lexical segment.
 *
 * @param value - Positive counter below one million.
 * @returns Final cardinal segment.
 */
export function finalSwedishSegment(value: number): string {
  const underHundred = value % 100;
  if (underHundred > 0) {
    const units = [
      "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio",
      "tio", "elva", "tolv"
    ] as const;
    if (underHundred < 13) return units[underHundred - 1] ?? "";
    if (underHundred < 20) {
      return [
        "tretton", "fjorton", "femton", "sexton", "sjutton", "arton",
        "nitton"
      ][underHundred - 13] ?? "";
    }
    const unit = underHundred % 10;
    if (unit > 0) return units[unit - 1] ?? "";
    return [
      "tjugo", "trettio", "fyrtio", "femtio", "sextio", "sjuttio",
      "åttio", "nittio"
    ][Math.floor(underHundred / 10) - 2] ?? "";
  }
  if (value % 1_000 > 0) return "hundra";
  return Math.floor(value / 1_000) === 1 ? "usen" : "tusen";
}
