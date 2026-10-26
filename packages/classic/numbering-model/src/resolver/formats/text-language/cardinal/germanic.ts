const germanUnits = [
  "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht",
  "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn",
  "sechzehn", "siebzehn", "achtzehn", "neunzehn"
] as const;
const germanTens = [
  "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig",
  "achtzig", "neunzig"
] as const;
const dutchUnits = [
  "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht",
  "negen", "tien", "elf", "twaalf", "dertien", "veertien", "vijftien",
  "zestien", "zeventien", "achttien", "negentien"
] as const;
const dutchTens = [
  "twintig", "dertig", "veertig", "vijftig", "zestig", "zeventig",
  "tachtig", "negentig"
] as const;
const swedishUnits = [
  "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio",
  "tio", "elva", "tolv", "tretton", "fjorton", "femton", "sexton",
  "sjutton", "arton", "nitton"
] as const;
const swedishTens = [
  "tjugo", "trettio", "fyrtio", "femtio", "sextio", "sjuttio",
  "åttio", "nittio"
] as const;

/**
 * Formats one German cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound German cardinal.
 */
export function formatGermanCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    parts.push(
      thousands >= 100
        ? formatGermanCardinal(thousands)
        : thousands === 1
          ? "ein"
          : formatGermanUnderHundred(thousands),
      "tausend"
    );
  }
  const hundreds = Math.floor(remainder / 100);
  if (hundreds > 0) {
    if (hundreds !== 1) parts.push(formatGermanUnderHundred(hundreds));
    parts.push("hundert");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) parts.push(formatGermanUnderHundred(underHundred));
  return parts.join("");
}

/**
 * Formats one German value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case German lexical compound.
 */
function formatGermanUnderHundred(value: number): string {
  if (value < 20) return germanUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = germanTens[Math.floor(value / 10) - 2] ?? "";
  if (unit === 0) return ten;
  const unitWord = unit === 1 ? "ein" : germanUnits[unit - 1] ?? "";
  return `${unitWord}und${ten}`;
}

/**
 * Formats one Dutch cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound Dutch cardinal.
 */
export function formatDutchCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    if (thousands >= 100) {
      parts.push(formatDutchCardinal(thousands));
    } else if (thousands !== 1 || remainder !== 0) {
      parts.push(formatDutchUnderHundred(thousands));
    }
    parts.push("duizend");
  }
  const hundreds = Math.floor(remainder / 100);
  if (hundreds > 0) {
    parts.push(formatDutchUnderHundred(hundreds), "honderd");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) parts.push(formatDutchUnderHundred(underHundred));
  return parts.join("");
}

/**
 * Formats one Dutch value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Dutch lexical compound.
 */
function formatDutchUnderHundred(value: number): string {
  if (value < 20) return dutchUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = dutchTens[Math.floor(value / 10) - 2] ?? "";
  if (unit === 0) return ten;
  const unitWord = dutchUnits[unit - 1] ?? "";
  const conjunction = unitWord.endsWith("e") ? "ën" : "en";
  return `${unitWord}${conjunction}${ten}`;
}

/**
 * Formats one Swedish cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound Swedish cardinal.
 */
export function formatSwedishCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    parts.push(
      thousands >= 100
        ? formatSwedishCardinal(thousands)
        : formatSwedishUnderHundred(thousands),
      thousands === 1 ? "usen" : "tusen"
    );
  }
  const hundreds = Math.floor(remainder / 100);
  if (hundreds > 0) {
    parts.push(formatSwedishUnderHundred(hundreds), "hundra");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) parts.push(formatSwedishUnderHundred(underHundred));
  return parts.join("");
}

/**
 * Formats one Swedish value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Swedish lexical compound.
 */
function formatSwedishUnderHundred(value: number): string {
  if (value < 20) return swedishUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = swedishTens[Math.floor(value / 10) - 2] ?? "";
  return unit === 0 ? ten : `${ten}${swedishUnits[unit - 1] ?? ""}`;
}
