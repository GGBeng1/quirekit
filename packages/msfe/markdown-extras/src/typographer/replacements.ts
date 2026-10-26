import type { TypographyEdit, TypographyRun } from "./types";

const symbols: Readonly<Record<string, string>> = { "(c)": "©", "(r)": "®", "(tm)": "™", "+-": "±" };

/** @param run - A confirmed plain-text gap. @returns Exact source edits for conventional punctuation, without touching newline or formatting markers. */
export function punctuationEdits(run: TypographyRun): TypographyEdit[] {
  const result: TypographyEdit[] = [];
  for (const match of run.text.matchAll(/\((?:c|r|tm)\)|\+-|\.{2,}|[?!]{4,}|,{2,}|-{2,}/giu)) {
    const value = match[0], before = run.text[match.index - 1] ?? " ", after = run.text[match.index + value.length] ?? " ";
    let text = symbols[value.toLowerCase()];
    if (value[0] === ".") text = /[?!]/u.test(before) ? ".." : "…";
    else if (/[?!]/u.test(value[0]!)) text = value.at(-1)!.repeat(3);
    else if (value[0] === ",") text = ",";
    else if (value === "---") text = "—";
    else if (value === "--" && /\s/u.test(before) === /\s/u.test(after)) text = "–";
    if (text && text !== value) result.push({ from: run.from + match.index, to: run.from + match.index + value.length, text });
  }
  return result;
}
