import { formatBulgarianCardinal } from "../cardinal/bulgarian";

const unitOrdinals: Readonly<Record<string, string>> = {
  един: "първият",
  два: "вторият",
  три: "третият",
  четири: "четвъртият",
  пет: "петият",
  шест: "шестият",
  седем: "седмият",
  осем: "осмият",
  хиляди: "хилядният"
};
const hundredOrdinals: Readonly<Record<string, string>> = {
  сто: "стотеният",
  двеста: "двестотеният",
  триста: "тристотеният",
  четиристотин: "четиристотеният",
  петстотин: "петстотеният",
  шестстотин: "шестстотеният",
  седемстотин: "седемстотеният",
  осемстотин: "осемстотеният",
  деветстотин: "деветстотеният"
};

/**
 * Formats one Bulgarian ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Bulgarian ordinal text.
 */
export function formatBulgarianOrdinal(value: number): string {
  const tokens = formatBulgarianCardinal(value)
    .split(" ")
    .map((token) => token === "хиляда" ? "хиляди" : token);
  const finalIndex = tokens.length - 1;
  const final = tokens[finalIndex] ?? "";
  const replacement = unitOrdinals[final] ?? hundredOrdinals[final];
  if (replacement) {
    tokens[finalIndex] = replacement;
  } else if (value % 100 !== 0) {
    tokens[finalIndex] = `${final}ият`;
  }
  if (Math.floor(value / 1_000) === 1) tokens.unshift("една");

  // A non-final hundred introduces a conjunction unless one already follows.
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index] ?? "";
    const next = tokens[index + 1];
    if (
      hundredOrdinals[token]
      && next !== "хилядният"
      && next !== "и"
    ) {
      tokens.splice(index + 1, 0, "и");
      index += 1;
    }
  }
  return tokens.join(" ");
}
