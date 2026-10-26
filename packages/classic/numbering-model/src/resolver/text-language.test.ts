import { describe, expect, it } from "vitest";

import { formatWordNumberingCounter } from "./format";

const cardinalMatrix = [
  ["bg-BG", "Двадесет и един", "Сто и един", "Хиляда"],
  ["cs-CZ", "Dvacet jedna", "Sto jedna", "Tisíc"],
  ["de-DE", "Einundzwanzig", "Hunderteins", "Eintausend"],
  ["el-GR", "Είκοσι ένα", "Εκατόv ένα", "Χίλια"],
  ["es-ES", "Veintiuno", "Ciento uno", "Mil"],
  ["eu-ES", "Hogeita bat", "Ehun eta bat", "Mila"],
  ["fr-FR", "Vingt et un", "Cent un", "Mille"],
  ["it-IT", "Ventuno", "Centouno", "Mille"],
  ["lv-LV", "Divdesmit viens", "Simts viens", "Tūkstotis"],
  ["nl-NL", "Éénentwintig", "Éénhonderdéén", "Duizend"],
  ["pl-PL", "Dwadzieścia jeden", "Sto jeden", "Tysiąc"],
  ["pt-BR", "Vinte e um", "Cento e um", "Mil"],
  ["pt-PT", "Vinte e um", "Cento e um", "Mil"],
  ["ru-RU", "Двадцать один", "Сто один", "Одна тысяча"],
  ["sk-SK", "Dvadsaťjeden", "Stojeden", "Jedentisíc"],
  ["sr-Cyrl-RS", "Двадесет један", "Сто један", "Тисућу"],
  ["sr-Latn-RS", "Dvadeset jedan", "Sto jedan", "Tisuću"],
  ["sv-SE", "Tjugoett", "Etthundraett", "Ettusen"],
  ["tr-TR", "Yirmibir", "Yüzbir", "Bin"],
  ["uk-UA", "Двадцять один", "Сто один", "Тисяча"]
] as const;

const ordinalMatrix = [
  ["bg-BG", "Двадесет и първият", "Сто и първият", "Една хилядният"],
  ["cs-CZ", "Dvacátý první", "Stý první", "Tisící"],
  ["de-DE", "Einundzwanzigste", "Hunderterste", "Eintausendste"],
  ["el-GR", "Εικοστό πρώτο", "Εκατοστό πρώτο", "Χιλιοστό"],
  ["es-ES", "Primero vigésimo", "Centésimo primero", "Milésimo"],
  ["eu-ES", "Hogeita batgarren", "Ehun eta batgarren", "Milagarren"],
  ["fr-FR", "Vingt et unième", "Cent unième", "Millième"],
  ["it-IT", "Ventunesimo", "Centounesimo", "Millesimo"],
  ["lv-LV", "Divdesmit pirmais", "Simts pirmais", "Tūkstošais"],
  ["nl-NL", "Éénentwintigste", "Éénhonderdeerste", "Duizendste"],
  ["pl-PL", "Dwudziesty pierwszy", "Sto pierwszy", "Tysiączny"],
  ["pt-BR", "Vigésimo primeiro", "Centésimo primeiro", "Milésimo"],
  ["pt-PT", "Vigésimo primeiro", "Centésimo primeiro", "Milésimo"],
  ["ru-RU", "Двадцать первый", "Сто первый", "Тысячный"],
  ["sk-SK", "Dvadsiatyprvý", "Stoprvý", "Tisíci"],
  ["sr-Cyrl-RS", "Двадесети први", "Сто први", "Тисућити"],
  ["sr-Latn-RS", "Dvadeseti prvi", "Sto prvi", "Tisućiti"],
  ["sv-SE", "Tjugoförsta", "Etthundraförsta", "Ettusende"],
  ["tr-TR", "Yirmibirinci", "Yüzbirinci", "Bininci"],
  ["uk-UA", "Двадцять перший", "Сто перший", "Тисячний"]
] as const;

describe("Word text numbering language matrix", () => {
  it.each(cardinalMatrix)(
    "formats cardinal text for %s",
    (language, twentyOne, oneHundredOne, oneThousand) => {
      const options = { language: { value: language } };
      expect(formatWordNumberingCounter("cardinalText", 21, options))
        .toBe(twentyOne);
      expect(formatWordNumberingCounter("cardinalText", 101, options))
        .toBe(oneHundredOne);
      expect(formatWordNumberingCounter("cardinalText", 1_000, options))
        .toBe(oneThousand);
    }
  );

  it.each(ordinalMatrix)(
    "formats ordinal text for %s",
    (language, twentyOne, oneHundredOne, oneThousand) => {
      const options = { language: { value: language } };
      expect(formatWordNumberingCounter("ordinalText", 21, options))
        .toBe(twentyOne);
      expect(formatWordNumberingCounter("ordinalText", 101, options))
        .toBe(oneHundredOne);
      expect(formatWordNumberingCounter("ordinalText", 1_000, options))
        .toBe(oneThousand);
    }
  );

  it("selects eastAsia for an ideographic primary language", () => {
    const language = {
      value: "zh-CN",
      eastAsia: "tr-TR",
      bidi: "de-DE"
    };
    expect(formatWordNumberingCounter("cardinalText", 21, { language }))
      .toBe("Yirmibir");
  });

  it("retains English behavior for explicit fallback and unknown tags", () => {
    for (const language of ["ar-SA", "ja-JP", "x-quirekit-test"]) {
      expect(formatWordNumberingCounter(
        "ordinalText",
        21,
        { language: { value: language } }
      )).toBe("Twenty-first");
    }
  });

  it("returns empty text at the mature one-million boundary", () => {
    expect(formatWordNumberingCounter(
      "cardinalText",
      1_000_000,
      { language: { value: "tr-TR" } }
    )).toBe("");
    expect(formatWordNumberingCounter(
      "ordinalText",
      1_000_000,
      { language: { value: "ru-RU" } }
    )).toBe("");
  });
});
