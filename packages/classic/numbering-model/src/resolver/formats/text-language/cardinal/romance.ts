const spanishUnits = [
  "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
  "nueve", "diez", "once", "doce", "trece", "catorce", "quince",
  "dieciséis", "diecisiete", "dieciocho", "diecinueve"
] as const;
const spanishTens = [
  "veint", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta",
  "ochenta", "noventa"
] as const;
const spanishHundreds = [
  "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos"
] as const;
const frenchUnits = [
  "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit",
  "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze",
  "seize", "dix-sept", "dix-huit", "dix-neuf"
] as const;
const frenchTens = [
  "vingt", "trente", "quarante", "cinquante", "soixante",
  "soixante-dix", "quatre-vingt", "quatre-vingt"
] as const;

/**
 * Formats one Spanish cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Spanish cardinal text.
 */
export function formatSpanishCardinal(value: number): string {
  return splitSpanish(value, false).join(" ");
}

/**
 * Splits a Spanish value into thousand, hundred, and remainder phases.
 *
 * @param value - Positive counter below one million.
 * @param isCoefficient - Whether the value is a recursive thousand coefficient.
 * @returns Ordered lexical components.
 */
function splitSpanish(value: number, isCoefficient: boolean): string[] {
  if (value <= 0 || value >= 1_000_000) return [];
  const result: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    if (thousands >= 100) {
      result.push(...splitSpanish(thousands, true));
    } else if (thousands !== 1) {
      result.push(formatSpanishUnderHundred(thousands));
    }
    result.push("mil");
  }
  const hundredDigit = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (hundredDigit > 0) {
    result.push(
      isCoefficient && hundredDigit === 1
        ? "cien"
        : spanishHundreds[hundredDigit - 1] ?? ""
    );
  }
  if (underHundred > 0) result.push(formatSpanishUnderHundred(underHundred));
  return result.filter(Boolean);
}

/**
 * Formats one Spanish value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Spanish lexical group.
 */
function formatSpanishUnderHundred(value: number): string {
  if (value < 20) return spanishUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = Math.floor(value / 10);
  if (ten === 2) {
    if (unit === 0) return "veinte";
    const accents: Readonly<Record<number, string>> = {
      2: "dós",
      3: "trés",
      6: "séis"
    };
    return `veinti${accents[unit] ?? spanishUnits[unit - 1] ?? ""}`;
  }
  const tenWord = spanishTens[ten - 2] ?? "";
  return unit === 0
    ? tenWord
    : `${tenWord} y ${spanishUnits[unit - 1] ?? ""}`;
}

/**
 * Formats one French cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case French cardinal text.
 */
export function formatFrenchCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    if (thousands >= 100) {
      parts.push(formatFrenchCardinal(thousands));
    } else if (thousands !== 1) {
      parts.push(formatFrenchUnderHundred(thousands));
    }
    parts.push("mille");
  }
  const hundredDigit = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (hundredDigit > 0) {
    if (hundredDigit !== 1) parts.push(formatFrenchUnderHundred(hundredDigit));
    parts.push(underHundred > 0 || hundredDigit === 1 ? "cent" : "cents");
  }
  if (underHundred > 0) parts.push(formatFrenchUnderHundred(underHundred));
  return parts.join(" ");
}

/**
 * Formats one French value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case French lexical group.
 */
function formatFrenchUnderHundred(value: number): string {
  if (value < 20) return frenchUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = Math.floor(value / 10);
  if (ten === 7) {
    if (unit === 0) return frenchTens[5] ?? "";
    const teen = frenchUnits[9 + unit] ?? "";
    return unit === 1 ? `soixante et ${teen}` : `soixante-${teen}`;
  }
  if (ten === 8) {
    if (unit === 0) return "quatre-vingts";
    return `quatre-vingt-${frenchUnits[unit - 1] ?? ""}`;
  }
  if (ten === 9) {
    if (unit === 0) return "quatre-vingt-dix";
    return `quatre-vingt-${frenchUnits[9 + unit] ?? ""}`;
  }
  const tenWord = frenchTens[ten - 2] ?? "";
  if (unit === 0) return tenWord;
  return unit === 1
    ? `${tenWord} et un`
    : `${tenWord}-${frenchUnits[unit - 1] ?? ""}`;
}
