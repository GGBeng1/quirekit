import { parseMathLatex } from '../latex/parse';
import type { MathDocument, MathExpression } from '../model/types';
import type { MathTemplate } from '../templates/types';
import { mathTemplateCaret } from '../templates/focus';
import { getMathVisualSlots, mathCaretAtSource } from './slots';
import type { MathVisualEdit, MathVisualSelection, MathVisualSlot } from './types';

/** Script roles of an expression that can take more scripts in place. */
interface ScriptTarget {
  /** Present lower role. */
  readonly subscript: boolean;
  /** Present upper role. */
  readonly superscript: boolean;
  /** Slot role names for the lower and upper script. */
  readonly roles: readonly [string, string];
}

/**
 * Finds whether an atom owns script roles that TeX lets us extend: `x_1` + `^` is `x_1^{}`.
 * @param expression - Atom before the caret.
 * @returns Present roles, or undefined when scripts must wrap the atom instead.
 */
function scriptTarget(expression: MathExpression): ScriptTarget | undefined {
  if (expression.kind === 'scripts') return { subscript: !!expression.subscript, superscript: !!expression.superscript, roles: ['subscript', 'superscript'] };
  if (expression.kind === 'function' && !expression.argument) return { subscript: !!expression.subscript, superscript: !!expression.superscript, roles: ['subscript', 'superscript'] };
  if (expression.kind === 'operator' && !expression.body) return { subscript: !!expression.lower, superscript: !!expression.upper, roles: ['lower', 'upper'] };
  return undefined;
}

/**
 * Adds script roles to the scripted atom before a collapsed caret instead of nesting it.
 * @param document - Current formula.
 * @param slot - Slot owning the caret.
 * @param selection - Collapsed caret after the atom.
 * @param template - Script template with its role contents.
 * @returns Atomic edit, or null when the template must wrap the atom.
 */
export function mergeMathScripts(document: MathDocument, slot: MathVisualSlot, selection: MathVisualSelection, template: MathTemplate): MathVisualEdit | null {
  const { scripts } = template;
  const index = selection.focus.index;
  const previous = slot.sequence.children[index - 1];
  if (!scripts || selection.anchor || slot.wrap || !previous) return null;
  const target = scriptTarget(previous);
  if (!target) return null;
  const wanted = (['subscript', 'superscript'] as const).filter(role => scripts[role] !== undefined);
  const occupied = wanted.filter(role => target[role]);
  if (occupied.length) {
    // A second `^` would be a TeX double script; continue in the existing script instead.
    if (wanted.length !== 1 || scripts[wanted[0]!] !== '') return null;
    const id = `${slot.id}/${index - 1}/${target.roles[wanted[0] === 'subscript' ? 0 : 1]}`;
    const existing = getMathVisualSlots(document).find(item => item.id === id);
    return existing ? { latex: document.latex, selection: { focus: { slot: id, index: existing.sequence.children.length } } } : null;
  }
  const inserted = wanted.map(role => `${role === 'subscript' ? '_' : '^'}{${scripts[role]}}`).join('');
  const at = previous.source.end;
  const latex = document.latex.slice(0, at) + inserted + document.latex.slice(at);
  const parsed = parseMathLatex(latex);
  if (!parsed.ok) return null;
  if (template.completes) return { latex, selection: { focus: { slot: slot.id, index } } };
  const caret = mathTemplateCaret(parsed.document, at, inserted.length, at + inserted.length);
  return { latex, selection: { focus: mathCaretAtSource(parsed.document, caret) } };
}
