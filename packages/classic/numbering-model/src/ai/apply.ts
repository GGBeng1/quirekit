import type { SingleCommands } from "@quirekit/core";
import { TextSelection, type Transaction } from "@quirekit/pm";
import { resolveWordNumberingRegistry, resolveWordParagraphNumbering } from "../model";
import { decimalDotWordOrderedPresetId } from "../presets/builtins/ids";
import { resolveWordNumberingLevel } from "../resolver/markers";
import { resolveWordListAiStarts, readWordListAiCounter } from "./starts";
import { readWordListAiStyle, wordListAiStyles } from "./styles";

/**
 * @param tr - Shared transaction.
 * @param from - Range start.
 * @param to - Range end.
 * @returns Positions before the list paragraphs in the range, in document order.
 */
function listParagraphs(tr: Transaction, from: number, to: number): number[] {
  const positions: number[] = [];
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    if (resolveWordParagraphNumbering(node.attrs.wordNumbering) !== null) positions.push(pos);
    return false;
  });
  return positions;
}

/** @param tr - Shared transaction. @param pos - Position before a paragraph. */
function selectParagraph(tr: Transaction, pos: number): void {
  tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)));
}

/**
 * Gives a level of each list in the range a named marker pattern.
 *
 * A pattern belongs to one level of a whole list, so each list and level is changed once,
 * with only one of its paragraphs selected: selecting paragraphs of several levels would
 * move them all to one level.
 *
 * @param tr - Shared transaction.
 * @param commands - Commands on the transaction.
 * @param from - Range start.
 * @param to - Range end.
 * @param name - Style name.
 * @returns Whether every change was accepted.
 */
export function applyWordListAiStyle(tr: Transaction, commands: SingleCommands, from: number, to: number, name: string): boolean {
  const style = wordListAiStyles[name];
  if (style === undefined) return false;
  const seen = new Set<string>();
  for (const pos of listParagraphs(tr, from, to)) {
    const numbering = resolveWordParagraphNumbering(tr.doc.nodeAt(pos)!.attrs.wordNumbering)!;
    const resolved = resolveWordNumberingLevel(resolveWordNumberingRegistry(tr.doc.attrs.wordNumberingRegistry), numbering.numId, numbering.level);
    const key = `${numbering.numId}:${numbering.level}`;
    if (seen.has(key) || resolved === undefined || readWordListAiStyle(resolved.level) === name) continue;
    seen.add(key);
    selectParagraph(tr, pos);
    const applied = style.builtin
      ? commands.applyWordNumberingPreset({ presetId: style.presetId })
      : commands.applyWordNumberingTemplate({ draft: {
          scope: "singleLevel", id: style.presetId, basePresetId: decimalDotWordOrderedPresetId,
          level: { format: style.format, text: style.text }
        } });
    if (!applied) return false;
    // The list moved to a new instance; the next paragraph of it now carries that identity.
    const moved = resolveWordParagraphNumbering(tr.doc.nodeAt(pos)!.attrs.wordNumbering)!;
    seen.add(`${moved.numId}:${moved.level}`);
  }
  return true;
}

/**
 * Makes the first numbered paragraph of the range show `start`.
 *
 * A higher number first tries continuing the list before, which is how a list picks up
 * an earlier list's numbering; otherwise, or when continuing gives another number, the
 * paragraph restarts at `start`.
 *
 * @param tr - Shared transaction.
 * @param commands - Commands on the transaction.
 * @param from - Range start.
 * @param to - Range end.
 * @param start - Number to show.
 * @returns Whether the paragraph shows the number.
 */
export function applyWordListAiStart(tr: Transaction, commands: SingleCommands, from: number, to: number, start: number): boolean {
  const pos = listParagraphs(tr, from, to).find(candidate => readWordListAiCounter(tr.doc, candidate) !== undefined);
  if (pos === undefined) return false;
  const counter = readWordListAiCounter(tr.doc, pos)!;
  if (counter === start && resolveWordListAiStarts(tr.doc).has(pos)) return true;
  selectParagraph(tr, pos);
  if (start > counter && commands.continueWordNumbering() && readWordListAiCounter(tr.doc, pos) === start) return true;
  selectParagraph(tr, pos);
  return commands.restartWordNumbering({ start });
}
