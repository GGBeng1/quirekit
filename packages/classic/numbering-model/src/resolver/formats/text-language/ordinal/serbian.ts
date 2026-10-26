import { formatInflectedThousandsCardinal } from "../cardinal/slavic";

const latinOrdinals: Readonly<Record<string, string>> = {
  jedan: "prvi",
  dva: "drugi",
  tri: "treći",
  četiri: "četvrti",
  pet: "peti",
  šest: "šesti",
  sedam: "sedmi",
  osam: "osmi",
  devet: "deveti",
  deset: "deseti",
  jedanaest: "jedanaesti",
  dvanaest: "dvanaesti",
  trinaest: "trinaesti",
  četrnaest: "četrnaesti",
  petnaest: "petnaesti",
  šesnaest: "šesnaesti",
  sedamnaest: "sedamnaesti",
  osamnaest: "osamnaesti",
  devetnaest: "devetnaesti",
  dvadeset: "dvadeseti",
  trideset: "trideseti",
  četrdeset: "četrdeseti",
  pedeset: "pedeseti",
  šezdeset: "šezdeseti",
  sedamdeset: "sedamdeseti",
  osamdeset: "osamdeseti",
  devedeset: "devedeseti",
  sto: "stoti",
  dvjesto: "dvjestoti",
  tristo: "tristoti",
  četiristo: "četiristoti",
  petsto: "petstoti",
  šesto: "šeststoti",
  sedamsto: "sedamstoti",
  osamsto: "osamstoti",
  devetsto: "devetstoti",
  tisuću: "tisućiti",
  tisuće: "tisućiti",
  tisuća: "tisućiti"
};
const cyrillicOrdinals: Readonly<Record<string, string>> = {
  један: "први",
  два: "други",
  три: "трећи",
  четири: "четврти",
  пет: "пети",
  шест: "шести",
  седам: "седми",
  осам: "осми",
  девет: "девети",
  десет: "десети",
  једанаест: "једанаести",
  дванаест: "дванаести",
  тринаест: "тринаести",
  четрнаест: "четрнаести",
  петнаест: "петнаести",
  шеснаест: "шеснаести",
  седамнаест: "седамнаести",
  осамнаест: "осамнаести",
  деветнаест: "деветнаести",
  двадесет: "двадесети",
  тридесет: "тридесети",
  четрдесет: "четрдесети",
  педесет: "педесети",
  шездесет: "шездесети",
  седамдесет: "седамдесети",
  осамдесет: "осамдесети",
  деведесет: "деведесети",
  сто: "стоти",
  двјесто: "двјестоти",
  тристо: "тристоти",
  четиристо: "четиристоти",
  петсто: "петстоти",
  шесто: "шестстоти",
  седамсто: "седамстоти",
  осамсто: "осамстоти",
  деветсто: "деветстоти",
  тисућу: "тисућити",
  тисуће: "тисућити",
  тисућа: "тисућити"
};

/**
 * Formats one Serbian ordinal in Latin or Cyrillic script.
 *
 * @param value - Positive counter below one million.
 * @param language - Serbian script language tag.
 * @returns Lower-case Serbian ordinal text.
 */
export function formatSerbianOrdinal(
  value: number,
  language: "sr-Cyrl-RS" | "sr-Latn-RS"
): string {
  const tokens = formatInflectedThousandsCardinal(value, language).split(" ");
  const map = language === "sr-Cyrl-RS"
    ? cyrillicOrdinals
    : latinOrdinals;
  const remainder = value % 100;
  const finalIndex = tokens.length - 1;
  if (remainder >= 20 && remainder % 10 !== 0) {
    tokens[finalIndex - 1] = map[tokens[finalIndex - 1] ?? ""]
      ?? tokens[finalIndex - 1]
      ?? "";
  }
  tokens[finalIndex] = map[tokens[finalIndex] ?? ""]
    ?? tokens[finalIndex]
    ?? "";
  return tokens.join(" ");
}
