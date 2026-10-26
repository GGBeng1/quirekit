import type { TypographerOptions, TypographyEdit, TypographyRun } from "./types";

/** @param character - A visible character adjacent to a quote. @returns Unicode punctuation or symbol classification. */
function punctuation(character: string): boolean { return /[\p{P}\p{S}]/u.test(character); }

/** @param runs - Native text flow with scope boundaries. @param index - Current run. @param step - Neighbor direction. @returns Closest visible character or block whitespace. */
function neighbor(runs: readonly TypographyRun[], index: number, step: -1 | 1): string {
  for (let cursor = index + step; cursor >= 0 && cursor < runs.length; cursor += step) {
    const text = runs[cursor]!.text; if (text) return step === -1 ? text.at(-1)! : text[0]!;
  }
  return " ";
}

/** @param runs - Source-ordered native prose gaps. @param quotes - Configured literal quote strings. @returns Same-level paired quotes and apostrophes, with unmatched double quotes preserved. */
export function quoteEdits(runs: readonly TypographyRun[], quotes: TypographerOptions["quotes"]): TypographyEdit[] {
  const result: TypographyEdit[] = [], pending: { position: number; depth: number; single: boolean }[] = [];
  for (let index = 0; index < runs.length; index++) {
    const run = runs[index]!;
    // Leaving an existing Markdown scope retires its unmatched quote; typography cannot change that scope.
    while (pending.length && pending.at(-1)!.depth > run.depth) pending.pop();
    for (const match of run.text.matchAll(/['"]/gu)) {
      const position = match.index, single = match[0] === "'";
      const before = run.text[position - 1] ?? neighbor(runs, index, -1);
      const after = run.text[position + 1] ?? neighbor(runs, index, 1);
      const leftPunctuation = punctuation(before), rightPunctuation = punctuation(after);
      let opens = !/\s/u.test(after) && (!rightPunctuation || /\s/u.test(before) || leftPunctuation);
      let closes = !/\s/u.test(before) && (!leftPunctuation || /\s/u.test(after) || rightPunctuation);
      if (!single && /[0-9]/u.test(before) && after === '"') opens = closes = false;
      if (opens && closes) { opens = leftPunctuation; closes = rightPunctuation; }
      const from = run.from + position;
      let target = -1;
      if (closes) for (let cursor = pending.length - 1; cursor >= 0; cursor--) {
        const item = pending[cursor]!; if (item.depth === run.depth && item.single === single) { target = cursor; break; }
      }
      if (target >= 0) {
        const opening = pending[target]!; pending.length = target;
        result.push({ from: opening.position, to: opening.position + 1, text: quotes[single ? 2 : 0] },
          { from, to: from + 1, text: quotes[single ? 3 : 1] });
      } else if (opens) pending.push({ position: from, depth: run.depth, single });
      else if (single && (!closes || !opens)) result.push({ from, to: from + 1, text: "’" });
    }
  }
  return result;
}
