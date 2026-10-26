const units = [
  "jeden", "dva", "tri", "štyri", "päť", "šesť", "sedem", "osem",
  "deväť", "desať", "jedenásť", "dvanásť", "trinásť", "štrnásť",
  "pätnásť", "šestnásť", "sedemnásť", "osemnásť", "devätnásť"
] as const;
const tens = [
  "dvadsať", "tridsať", "štyridsať", "päťdesiat", "šesťdesiat",
  "sedemdesiat", "osemdesiat", "deväťdesiat"
] as const;
const ordinals: Readonly<Record<string, string>> = {
  jeden: "prvý",
  dva: "druhý",
  tri: "tretí",
  štyri: "štvrtý",
  päť: "piaty",
  šesť: "šiesty",
  sedem: "siedmy",
  osem: "ôsmy",
  deväť: "deviaty",
  desať: "desiaty",
  jedenásť: "jedenásty",
  dvanásť: "dvanásty",
  trinásť: "trinásty",
  štrnásť: "štrnásty",
  pätnásť: "pätnásty",
  šestnásť: "šestnásty",
  sedemnásť: "sedemnásty",
  osemnásť: "osemnásty",
  devätnásť: "devätnásty",
  dvadsať: "dvadsiaty",
  tridsať: "tridsiaty",
  štyridsať: "štyridsiaty",
  päťdesiat: "päťdesiaty",
  šesťdesiat: "šesťdesiaty",
  sedemdesiat: "sedemdesiaty",
  osemdesiat: "osemdesiaty",
  deväťdesiat: "deväťdesiaty",
  tisíc: "tisíci",
  sto: "stý"
};
const hundredPrefixes: Readonly<Record<string, string>> = {
  dve: "dvoj",
  dva: "dvoj",
  tri: "troj"
};
const otherPrefixes: Readonly<Record<string, string>> = {
  dve: "dvoj",
  dva: "dvoj",
  tri: "tretí",
  štyri: "štvrtý",
  päť: "piaty",
  osem: "ôsmy",
  deväť: "deviaty",
  jedenásť: "jedenásty",
  dvanásť: "dvanásty",
  trinásť: "trinásty",
  štrnásť: "štrnásty",
  pätnásť: "pätnásty",
  šestnásť: "šestnásty",
  sedemnásť: "sedemnásty",
  osemnásť: "osemnásty",
  devätnásť: "devätnásty",
  tridsať: "třicátý",
  štyridsať: "čtyřicátý",
  šesťdesiat: "šedesátý",
  sedemdesiat: "sedmdesátý",
  osemdesiat: "osmdesátý",
  deväťdesiat: "devadesátý"
};

/**
 * Formats one Slovak ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case compound Slovak ordinal text.
 */
export function formatSlovakOrdinal(value: number): string {
  const tokens = splitSlovakCardinal(value);
  const remainder = value % 100;
  if (value % 10 !== 0 && remainder > 10) {
    const index = tokens.length - 2;
    tokens[index] = ordinals[tokens[index] ?? ""] ?? tokens[index] ?? "";
  }
  if (Math.floor(value / 1_000) === 1) tokens.shift();
  const finalIndex = tokens.length - 1;
  tokens[finalIndex] = ordinals[tokens[finalIndex] ?? ""]
    ?? tokens[finalIndex]
    ?? "";
  for (let index = 1; index < tokens.length; index += 1) {
    const previous = tokens[index - 1] ?? "";
    if (tokens[index] === "sto" || tokens[index] === "stý") {
      tokens[index - 1] = hundredPrefixes[previous] ?? previous;
    } else {
      tokens[index - 1] = otherPrefixes[previous] ?? previous;
    }
  }
  return tokens.join("");
}

/**
 * Splits a Slovak cardinal into the lexical components consumed by ordinals.
 *
 * @param value - Positive counter below one million.
 * @returns Ordered cardinal components.
 */
function splitSlovakCardinal(value: number): string[] {
  if (value <= 0 || value >= 1_000_000) return [];
  const result: string[] = [];
  const thousands = Math.floor(value / 1_000);
  const remainder = value % 1_000;
  if (thousands > 0) {
    result.push(
      ...(thousands >= 100
        ? splitSlovakCardinal(thousands)
        : splitSlovakUnderHundred(thousands, false)),
      "tisíc"
    );
  }
  const hundredDigit = Math.floor(remainder / 100);
  if (hundredDigit > 0) {
    if (hundredDigit !== 1) {
      result.push(...splitSlovakUnderHundred(hundredDigit, true));
    }
    result.push("sto");
  }
  const underHundred = remainder % 100;
  if (underHundred > 0) {
    result.push(...splitSlovakUnderHundred(underHundred, false));
  }
  return result;
}

/**
 * Splits one Slovak value below one hundred.
 *
 * @param value - Value from one through 99.
 * @param isHundredCoefficient - Whether two uses its feminine form.
 * @returns Lexical components.
 */
function splitSlovakUnderHundred(
  value: number,
  isHundredCoefficient: boolean
): string[] {
  if (value < 20) {
    return [
      value === 2 && isHundredCoefficient
        ? "dve"
        : units[value - 1] ?? ""
    ];
  }
  const unit = value % 10;
  const ten = tens[Math.floor(value / 10) - 2] ?? "";
  return unit === 0 ? [ten] : [ten, units[unit - 1] ?? ""];
}
