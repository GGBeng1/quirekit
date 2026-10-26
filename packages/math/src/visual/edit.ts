import { parseMathLatex } from '../latex/parse';
import type { MathDocument, MathExpression } from '../model/types';
import type { MathTemplate } from '../templates/types';
import { mathTemplateCaret } from '../templates/focus';
import { escapeMathText, joinMathTokens, mathInputTokens, splitMathInput } from './input';
import { mergeMathScripts } from './scripts';
import { getMathVisualSlots, mathCaretAtSource, mathChildSpan } from './slots';
import { appendMathText, deleteMathTextCharacter } from './text';
import type { MathVisualEdit, MathVisualSelection, MathVisualSlot } from './types';

/** Leaf children deleted directly instead of being selected first. */
const leafKinds = new Set<MathExpression['kind']>(['symbol', 'space', 'delimiter', 'switch', 'marker']);

/**
 * Resolves a same-slot selection against the current slot index.
 * @param document - Current complete formula.
 * @param selection - Requested endpoints.
 * @returns Slot and ordered child bounds, or undefined when the endpoints are invalid.
 */
function resolve(document: MathDocument, selection: MathVisualSelection): { slot: MathVisualSlot; low: number; high: number } | undefined {
  const slot = getMathVisualSlots(document).find(item => item.id === selection.focus.slot);
  if (!slot || selection.anchor && selection.anchor.slot !== slot.id) return undefined;
  const low = Math.min(selection.focus.index, selection.anchor?.index ?? selection.focus.index);
  const high = Math.max(selection.focus.index, selection.anchor?.index ?? selection.focus.index);
  if (low < 0 || high > slot.sequence.children.length || !Number.isInteger(low) || !Number.isInteger(high)) return undefined;
  return { slot, low, high };
}

/**
 * Applies one admitted replacement in a structural selection, preserving other source.
 * @param document - Current complete formula.
 * @param selection - Syntax-safe internal endpoints.
 * @param pattern - Replacement with one marker for the selected fragment, or literal source.
 * @param template - Whether pattern is a template with an insertion marker.
 * @returns Atomic edit or null; failure never exposes partially changed source.
 */
function replace(document: MathDocument, selection: MathVisualSelection, pattern: string, template: boolean): MathVisualEdit | null {
  const resolved = resolve(document, selection);
  if (!resolved) return null;
  const { slot, low, high } = resolved;
  const children = slot.sequence.children;
  // Appending goes after the last child, never after trailing spaces or a `%` comment.
  const from = children[low] ? mathChildSpan(children[low]!, document.latex).from
    : children.length ? mathChildSpan(children.at(-1)!, document.latex).to : slot.from;
  const to = high > low ? mathChildSpan(children[high - 1]!, document.latex).to : from;
  const fragment = document.latex.slice(from, to);
  const marker = pattern.indexOf('◊');
  if (template && (marker < 0 || marker !== pattern.lastIndexOf('◊'))) return null;
  const inserted = template ? pattern.slice(0, marker) + fragment + pattern.slice(marker + 1) : pattern;
  const prefix = document.latex.slice(slot.from, from);
  const suffix = document.latex.slice(to, slot.to);
  // Keep control words separate from newly adjacent letters without rewriting author tokens.
  const before = /\\[A-Za-z]+$/u.test(prefix) && /^[A-Za-z]/u.test(inserted || suffix) ? ' ' : '';
  const after = /\\[A-Za-z]+$/u.test(prefix + before + inserted) && /^[A-Za-z]/u.test(suffix) ? ' ' : '';
  const content = prefix + before + inserted + after + suffix;
  // A formerly single-token argument must become a group before content can grow.
  const latex = document.latex.slice(0, slot.from) + (slot.wrap ? `{${content}}` : content) + document.latex.slice(slot.to);
  const parsed = parseMathLatex(latex);
  if (!parsed.ok) return null;
  const start = from + before.length + (slot.wrap ? 1 : 0);
  const fallback = start + (template ? marker + fragment.length : inserted.length);
  const caret = template ? mathTemplateCaret(parsed.document, start, inserted.length, fallback) : fallback;
  return { latex, selection: { focus: mathCaretAtSource(parsed.document, caret) } };
}
/**
 * Inserts typed or pasted characters at the internal caret.
 * Pasted LaTeX (`\frac{a}{b}`) is inserted as structure when it is a complete formula and
 * rejected otherwise. Single syntax characters are escaped, prose scripts such as Chinese
 * become `\text{}`, and spaces between math characters are ignored as TeX does.
 * @param document - Current complete formula.
 * @param selection - Internal selection.
 * @param text - Keyboard, symbol-pad, composition, or pasted characters.
 * @returns Atomic edit, an unchanged edit for space-only input, or null for unsupported input.
 */
export function insertMathVisualText(document: MathDocument, selection: MathVisualSelection, text: string): MathVisualEdit | null {
  if (text.length > 16384) return null;
  const resolved = resolve(document, selection);
  if (!resolved) return null;
  if ([...text].length > 1 && /[\\^_{}]/u.test(text)) {
    return parseMathLatex(text).ok ? replace(document, selection, text.trim(), false) : null;
  }
  const runs = splitMathInput(text);
  if (!runs.length) return { latex: document.latex, selection };
  const previous = resolved.slot.sequence.children[resolved.low - 1];
  if (runs.length === 1 && runs[0]!.mode === 'text' && resolved.low === resolved.high && previous?.kind === 'text') {
    const appended = appendMathText(document, previous, runs[0]!.value, selection);
    if (appended) return appended;
  }
  const tokens: string[] = [];
  for (const run of runs) {
    if (run.mode === 'text') {
      tokens.push(`\\text{${escapeMathText(run.value)}}`);
      continue;
    }
    const math = mathInputTokens(run.value, resolved.slot.sequence);
    if (!math) return null;
    tokens.push(...math);
  }
  return replace(document, selection, joinMathTokens(tokens), false);
}
/**
 * Inserts an admitted structure and moves into its first empty authoring slot.
 * @param document - Current complete formula.
 * @param selection - Internal selection to wrap.
 * @param template - Structural template.
 * @returns Atomic edit or null.
 */
export function insertMathVisualTemplate(document: MathDocument, selection: MathVisualSelection, template: MathTemplate): MathVisualEdit | null {
  const scripted = template.capturePrevious && !selection.anchor && selection.focus.index > 0;
  if (scripted) {
    const slot = resolve(document, selection)?.slot;
    const merged = slot && mergeMathScripts(document, slot, selection, template);
    if (merged) return merged;
  }
  const selected = scripted ? { focus: selection.focus, anchor: { slot: selection.focus.slot, index: selection.focus.index - 1 } } : selection;
  const edit = replace(document, selected, template.pattern, true);
  if (edit && scripted && template.completes) {
    return { latex: edit.latex, selection: { focus: { slot: selection.focus.slot, index: selection.focus.index } } };
  }
  return edit;
}
/**
 * Deletes a leaf or one text character, or selects a complete structure before destructive deletion.
 * @param document - Current complete formula.
 * @param selection - Current caret or structural selection.
 * @param forward - Delete rather than Backspace.
 * @returns Source edit, selection-only result, or null at an outer boundary.
 */
export function deleteMathVisual(document: MathDocument, selection: MathVisualSelection, forward = false): MathVisualEdit | null {
  if (selection.anchor && selection.anchor.index !== selection.focus.index) return replace(document, selection, '', false);
  const slot = getMathVisualSlots(document).find(item => item.id === selection.focus.slot);
  if (!slot) return null;
  const index = selection.focus.index + (forward ? 0 : -1);
  const child = slot.sequence.children[index];
  if (!child) return slot.parent ? { latex: document.latex, selection: { focus: slot.parent, anchor: { slot: slot.parent.slot, index: slot.parent.index + 1 } } } : null;
  if (child.kind === 'text') {
    const edited = deleteMathTextCharacter(document, child, forward, { focus: selection.focus });
    if (edited) return edited;
  }
  const selected = { focus: { slot: slot.id, index }, anchor: { slot: slot.id, index: index + 1 } };
  const atomic = leafKinds.has(child.kind) || child.kind === 'text' && child.parts.every(part => part.kind === 'run');
  return atomic ? replace(document, selected, '', false) : { latex: document.latex, selection: selected };
}
