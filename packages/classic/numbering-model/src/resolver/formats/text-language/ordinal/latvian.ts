import { formatInflectedThousandsCardinal } from "../cardinal/slavic";

const units = [
  "viens", "divi", "trīs", "četri", "pieci", "seši", "septiņi",
  "astoņi", "deviņi", "desmit", "vienpadsmit", "divpadsmit",
  "trīspadsmit", "četrpadsmit", "piecpadsmit", "sešpadsmit",
  "septiņpadsmit", "astoņpadsmit", "deviņpadsmit"
] as const;
const tens = [
  "divdesmit", "trīsdesmit", "četrdesmit", "piecdesmit", "sešdesmit",
  "septiņdesmit", "astoņdesmit", "deviņdesmit"
] as const;
const hundreds = [
  "simti", "divi simti", "trīs simti", "četri simti", "pieci simti",
  "seši simti", "septiņi simti", "astoņi simti", "deviņi simti"
] as const;
const irregular: Readonly<Record<string, string>> = {
  viens: "pirmais",
  divi: "otrais",
  trīs: "trešais",
  četri: "ceturtais",
  pieci: "piektais",
  seši: "sestais",
  septiņi: "septītais",
  astoņi: "astotais",
  deviņi: "devītais"
};

/**
 * Formats one Latvian ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Latvian ordinal text.
 */
export function formatLatvianOrdinal(value: number): string {
  const cardinal = formatInflectedThousandsCardinal(value, "lv-LV")
    .replaceAll("tūkstotis", "tūkstoš")
    .replaceAll("tūkstoši", "tūkstoš");
  const segment = finalLatvianSegment(value);
  const normalizedSegment = segment.startsWith("tūksto")
    ? "tūkstoš"
    : segment;
  const ordinal = irregular[segment] ?? `${
    value % 100 === 0 && value % 1_000 !== 0
      ? normalizedSegment.slice(0, -1)
      : normalizedSegment
  }ais`;
  return cardinal.endsWith(normalizedSegment)
    ? `${cardinal.slice(0, -normalizedSegment.length)}${ordinal}`
    : cardinal;
}

/**
 * Identifies the final Latvian cardinal element before ordinal mutation.
 *
 * @param value - Positive counter below one million.
 * @returns Final lexical element.
 */
function finalLatvianSegment(value: number): string {
  const remainder = value % 1_000;
  const underHundred = remainder % 100;
  if (underHundred > 0) {
    if (underHundred < 20) return units[underHundred - 1] ?? "";
    const unit = underHundred % 10;
    return unit > 0
      ? units[unit - 1] ?? ""
      : tens[Math.floor(underHundred / 10) - 2] ?? "";
  }
  const hundredDigit = Math.floor(remainder / 100);
  if (hundredDigit > 0) return hundreds[hundredDigit - 1] ?? "";
  return Math.floor(value / 1_000) % 10 === 1
    ? "tūkstotis"
    : "tūkstoši";
}
