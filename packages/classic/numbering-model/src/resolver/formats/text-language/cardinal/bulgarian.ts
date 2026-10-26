const units = [
  "един", "два", "три", "четири", "пет", "шест", "седем", "осем",
  "девет", "десет", "единадесет", "дванадесет", "тринадесет",
  "четиринадесет", "петнадесет", "шестнадесет", "седемнадесет",
  "осемнадесет", "деветнадесет"
] as const;
const tens = [
  "двадесет", "тридесет", "четиридесет", "петдесет", "шестдесет",
  "седемдесет", "осемдесет", "деветдесет"
] as const;
const hundreds = [
  "сто", "двеста", "триста", "четиристотин", "петстотин",
  "шестстотин", "седемстотин", "осемстотин", "деветстотин"
] as const;

/**
 * Formats one Bulgarian cardinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Bulgarian cardinal text.
 */
export function formatBulgarianCardinal(value: number): string {
  return splitBulgarian(value).join(" ");
}

/**
 * Splits a Bulgarian value into thousand, hundred, and remainder phases.
 *
 * @param value - Positive counter below one million.
 * @returns Ordered lexical components.
 */
function splitBulgarian(value: number): string[] {
  if (value <= 0 || value >= 1_000_000) return [];
  const result: string[] = [];
  const thousandGroup = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousandGroup > 0) {
    const coefficient = thousandGroup >= 100
      ? splitBulgarian(thousandGroup)
      : thousandGroup === 1
        ? []
        : formatUnderHundred(thousandGroup);
    const finalDigit = thousandGroup % 10;
    if (finalDigit >= 2 && finalDigit <= 4) {
      if (finalDigit === 2) coefficient[coefficient.length - 1] = "две";
      coefficient.push("хиляди");
    } else {
      coefficient.push(finalDigit === 1 ? "хиляда" : "хиляди");
    }
    result.push(...coefficient);
  }
  const hundredDigit = Math.floor(remainder / 100);
  const underHundred = remainder % 100;
  if (hundredDigit > 0) result.push(hundreds[hundredDigit - 1] ?? "");
  if (underHundred > 0) {
    if (
      (underHundred < 11 || underHundred % 10 === 0)
      && (hundredDigit > 0 || thousandGroup > 0)
    ) {
      result.push("и");
    }
    result.push(...formatUnderHundred(underHundred));
  }
  return result.filter(Boolean);
}

/**
 * Formats one Bulgarian value below one hundred.
 *
 * @param value - Value from one through 99.
 * @returns Lexical components with an optional conjunction.
 */
function formatUnderHundred(value: number): string[] {
  if (value < 20) return [units[value - 1] ?? ""];
  const ten = tens[Math.floor(value / 10) - 2] ?? "";
  const unit = value % 10;
  return unit === 0 ? [ten] : [ten, "и", units[unit - 1] ?? ""];
}
