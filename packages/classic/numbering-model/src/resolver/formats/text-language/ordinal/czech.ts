import { formatInflectedThousandsCardinal } from "../cardinal/slavic";

import { replaceLexicalPhrases } from "./phrase-replacements";

const czechOrdinals: Readonly<Record<string, string>> = {
  jedna: "první",
  dva: "druhý",
  tři: "třetí",
  čtyři: "čtvrtý",
  pět: "pátý",
  šest: "šestý",
  sedm: "sedmý",
  osm: "osmý",
  devět: "devátý",
  deset: "desátý",
  jedenáct: "jedenáctý",
  dvanáct: "dvanáctý",
  třináct: "třináctý",
  čtrnáct: "čtrnáctý",
  patnáct: "patnáctý",
  šestnáct: "šestnáctý",
  sedmnáct: "sedmnáctý",
  osmnáct: "osmnáctý",
  devatenáct: "devatenáctý",
  dvacet: "dvacátý",
  třicet: "třicátý",
  čtyřicet: "čtyřicátý",
  padesát: "padesátý",
  šedesát: "šedesátý",
  sedmdesát: "sedmdesátý",
  osmdesát: "osmdesátý",
  devadesát: "devadesátý",
  sto: "stý",
  "dvě stě": "dvoustý",
  "tři sta": "třístý",
  "čtyři sta": "čtyřstý",
  "pět set": "pětistý",
  "šest set": "šestistý",
  "sedm set": "sedmistý",
  "osm set": "osmistý",
  "devět set": "devítistý",
  tisíc: "tisící",
  tisíce: "tisící"
};

/**
 * Formats one Czech ordinal below one million.
 *
 * @param value - Positive counter below one million.
 * @returns Lower-case Czech ordinal text.
 */
export function formatCzechOrdinal(value: number): string {
  return replaceLexicalPhrases(
    formatInflectedThousandsCardinal(value, "cs-CZ"),
    czechOrdinals
  );
}
