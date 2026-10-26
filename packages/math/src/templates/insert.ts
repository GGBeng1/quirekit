import { parseMathLatex } from '../latex/parse';
import type { MathTemplate, MathTemplateInsertion } from './types';
import { mathTemplateCaret } from './focus';

/**
 * Wraps selected source in a validated structural template without altering it.
 * @param latex - Original author source.
 * @param from - Inclusive UTF-16 selection start.
 * @param to - Exclusive UTF-16 selection end.
 * @param template - Catalog template with exactly one insertion marker.
 * @returns Updated source and caret, or null when the selection is unsafe.
 */
export function insertMathTemplate(latex: string, from: number, to: number, template: MathTemplate): MathTemplateInsertion | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > latex.length) return null;
  if (splitsScalar(latex, from) || splitsScalar(latex, to)) return null;
  const marker = template.pattern.indexOf('◊');
  if (marker < 0 || template.pattern.lastIndexOf('◊') !== marker) return null;
  const selected = latex.slice(from, to);
  // Validate the fragment as a whole so a selection inside a command cannot create partial syntax.
  if (!parseMathLatex(selected).ok) return null;
  const replacement = template.pattern.slice(0, marker) + selected + template.pattern.slice(marker + 1);
  const next = latex.slice(0, from) + replacement + latex.slice(to);
  const parsed = parseMathLatex(next);
  if (!parsed.ok) return null;
  return { latex: next, caret: mathTemplateCaret(parsed.document, from, replacement.length, from + marker + selected.length) };
}

/**
 * Checks whether a source boundary cuts a surrogate pair.
 * @param source - UTF-16 string.
 * @param offset - Boundary under consideration.
 * @returns Whether the boundary splits one Unicode scalar.
 */
function splitsScalar(source: string, offset: number): boolean {
  const previous = source.charCodeAt(offset - 1);
  const next = source.charCodeAt(offset);
  return previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
}
