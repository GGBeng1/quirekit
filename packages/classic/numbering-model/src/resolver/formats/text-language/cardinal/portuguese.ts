const portugueseUnits = [
  "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito",
  "nove", "dez", "onze", "doze", "treze", "quartorze", "quinze",
  "dezesseis", "dezessete", "dezoito", "dezenove"
] as const;
const portugueseTens = [
  "vinte", "trinta", "quarenta", "cinqüenta", "sessenta", "setenta",
  "oitenta", "noventa"
] as const;
const portugueseHundreds = [
  "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos"
] as const;

/**
 * Formats one Portuguese cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Portuguese cardinal text.
 */
export function formatPortugueseCardinal(value: number): string {
  if (value <= 0 || value >= 1_000_000) return "";
  const parts: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  const hundredDigit = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (thousands > 0) {
    if (thousands >= 100) {
      parts.push(formatPortugueseCardinal(thousands));
    } else if (thousands !== 1) {
      parts.push(formatPortugueseUnderHundred(thousands));
    }
    parts.push("mil");
    if ((hundredDigit > 0) !== (underHundred > 0)) parts.push("e");
  }
  if (hundredDigit > 0) {
    parts.push(
      hundredDigit === 1 && (underHundred > 0 || thousands > 0)
        ? "cento"
        : portugueseHundreds[hundredDigit - 1] ?? ""
    );
    if (underHundred > 0) parts.push("e");
  }
  if (underHundred > 0) parts.push(formatPortugueseUnderHundred(underHundred));
  return parts.join(" ");
}

/**
 * Formats one Portuguese value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lower-case Portuguese lexical group.
 */
function formatPortugueseUnderHundred(value: number): string {
  if (value < 20) return portugueseUnits[value - 1] ?? "";
  const unit = value % 10;
  const ten = portugueseTens[Math.floor(value / 10) - 2] ?? "";
  return unit === 0
    ? ten
    : `${ten} e ${portugueseUnits[unit - 1] ?? ""}`;
}
