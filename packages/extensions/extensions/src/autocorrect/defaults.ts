import type { AutoCorrectEntry } from "./types";

/**
 * Word's default symbol replacements.
 *
 * Arrows and faces are rich-text Wingdings entries in Word; their Unicode
 * counterparts are used here.
 */
export const defaultAutoCorrectEntries: readonly AutoCorrectEntry[] = Object.freeze([
  { from: "(c)", to: "©" },
  { from: "(e)", to: "€" },
  { from: "(r)", to: "®" },
  { from: "(tm)", to: "™" },
  { from: "...", to: "…" },
  { from: "-->", to: "→" },
  { from: "<--", to: "←" },
  { from: "==>", to: "⇒" },
  { from: "<==", to: "⇐" },
  { from: "<=>", to: "⇔" },
  { from: ":)", to: "☺" },
  { from: ":-)", to: "☺" },
  { from: ":(", to: "☹" },
  { from: ":-(", to: "☹" },
  { from: ":|", to: "😐" },
  { from: ":-|", to: "😐" }
]);

/** Common abbreviations from Word's first-letter exception list that end a word with a period. */
export const defaultFirstLetterExceptions: readonly string[] = Object.freeze([
  "a.", "abbr.", "approx.", "apr.", "assn.", "assoc.", "asst.", "aug.", "ave.", "avg.", "bldg.", "blvd.", "bros.", "ca.",
  "cf.", "cm.", "co.", "corp.", "dec.", "dept.", "dr.", "e.g.", "eq.", "esp.", "est.", "etc.", "feb.", "fig.", "fri.", "ft.",
  "gov.", "govt.", "hr.", "hrs.", "i.e.", "inc.", "incl.", "jan.", "jr.", "jul.", "jun.", "kg.", "km.", "lb.", "ltd.", "mar.",
  "max.", "min.", "misc.", "mon.", "mr.", "mrs.", "ms.", "mt.", "no.", "nov.", "oct.", "p.", "pp.", "prof.", "rd.", "sat.",
  "sep.", "sept.", "sr.", "st.", "sun.", "thu.", "tue.", "vol.", "vs.", "wed."
]);
