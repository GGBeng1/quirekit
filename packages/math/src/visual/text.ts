import { parseMathLatex } from '../latex/parse';
import type { MathDocument, MathText } from '../model/types';
import { escapeMathText } from './input';
import type { MathVisualEdit, MathVisualSelection } from './types';

const lastUnit = /(?:\\[A-Za-z]+(?:\{\})?|\\.|.)$/su;
const firstUnit = /^(?:\\[A-Za-z]+(?:\{\})?|\\.|.)/su;

/**
 * Accepts a source splice only when the whole result still parses.
 * @param document - Current formula.
 * @param from - Inclusive splice start.
 * @param to - Exclusive splice end.
 * @param insert - Replacement source.
 * @param selection - Selection after the edit.
 * @returns Atomic edit, or null when the splice is invalid.
 */
function splice(document: MathDocument, from: number, to: number, insert: string, selection: MathVisualSelection): MathVisualEdit | null {
  const latex = document.latex.slice(0, from) + insert + document.latex.slice(to);
  return parseMathLatex(latex).ok ? { latex, selection } : null;
}

/**
 * Appends typed text inside an adjacent braced text command instead of starting a new one.
 * @param document - Current formula.
 * @param text - Text node immediately before the caret.
 * @param value - Literal typed text.
 * @param selection - Collapsed caret after the text node, which stays after it.
 * @returns Atomic edit, or null when the node cannot take more text in place.
 */
export function appendMathText(document: MathDocument, text: MathText, value: string, selection: MathVisualSelection): MathVisualEdit | null {
  const end = text.source.end;
  if (document.latex[end - 1] !== '}' || text.parts.at(-1)?.kind !== 'run') return null;
  return splice(document, end - 1, end - 1, escapeMathText(value), selection);
}

/**
 * Deletes one character inside a text command; a structure ending in a nested formula is not split.
 * @param document - Current formula.
 * @param text - Text node beside the caret.
 * @param forward - Delete the first character instead of the last.
 * @param selection - Caret, which stays beside the node.
 * @returns Atomic edit, or null when the whole node must be selected or removed instead.
 */
export function deleteMathTextCharacter(document: MathDocument, text: MathText, forward: boolean, selection: MathVisualSelection): MathVisualEdit | null {
  const run = forward ? text.parts[0] : text.parts.at(-1);
  if (run?.kind !== 'run' || text.parts.length === 1 && [...run.value].length <= 1) return null;
  const raw = document.latex.slice(run.source.start, run.source.end);
  const unit = (forward ? firstUnit : lastUnit).exec(raw)?.[0];
  if (!unit || unit === '{' || unit === '}') return null;
  const from = forward ? run.source.start : run.source.end - unit.length;
  return splice(document, from, from + unit.length, '', selection);
}
