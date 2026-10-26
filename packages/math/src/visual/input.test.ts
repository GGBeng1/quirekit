import { describe, expect, it } from 'vitest';
import { parseMathLatex } from '../latex/parse';
import { mathTemplates } from '../templates/catalog';
import { deleteMathVisual, insertMathVisualTemplate, insertMathVisualText } from './edit';
import type { MathVisualSelection } from './types';

/**
 * Loads a valid fixture source.
 * @param source - Supported formula.
 * @returns Complete formula document.
 */
function doc(source: string) {
  const result = parseMathLatex(source);
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.document;
}
/**
 * Places a caret at the end of the root slot.
 * @param source - Supported formula.
 * @returns Caret after the last root child.
 */
function end(source: string): MathVisualSelection {
  return { focus: { slot: 'root', index: doc(source).root.children.length } };
}
const template = (id: string) => mathTemplates.find(item => item.id === id)!;

describe('typed and pasted visual input', () => {
  it('escapes syntax characters instead of rejecting them', () => {
    expect(insertMathVisualText(doc('x'), end('x'), '{')?.latex).toBe(String.raw`x\{`);
    expect(insertMathVisualText(doc('x'), end('x'), '[')?.latex).toBe('x[');
    expect(insertMathVisualText(doc('x'), end('x'), '%')?.latex).toBe(String.raw`x\%`);
    expect(insertMathVisualText(doc('x'), end('x'), '/')?.latex).toBe('x/');
    expect(insertMathVisualText(doc(String.raw`\sqrt[3]{x}`), { focus: { slot: 'root/0/degree', index: 1 } }, ']')?.latex).toBe(String.raw`\sqrt[3{]}]{x}`);
  });

  it('ignores spaces between math characters without a history-visible change', () => {
    const blank = insertMathVisualText(doc('x'), end('x'), '  ');
    expect(blank).toEqual({ latex: 'x', selection: end('x') });
    expect(insertMathVisualText(doc('x'), end('x'), 'a b')?.latex).toBe('xab');
  });

  it('types Chinese as text and continues an adjacent text command', () => {
    const first = insertMathVisualText(doc('x='), end('x='), '速度')!;
    expect(first.latex).toBe(String.raw`x=\text{速度}`);
    expect(insertMathVisualText(doc(first.latex), first.selection, '和')?.latex).toBe(String.raw`x=\text{速度和}`);
    expect(insertMathVisualText(doc(''), end(''), 'v是速度')?.latex).toBe(String.raw`v\text{是速度}`);
  });

  it('deletes text one character at a time before removing the command', () => {
    const once = deleteMathVisual(doc(String.raw`\text{速度}`), end(String.raw`\text{速度}`))!;
    expect(once.latex).toBe(String.raw`\text{速}`);
    expect(deleteMathVisual(doc(once.latex), once.selection)?.latex).toBe('');
    expect(deleteMathVisual(doc(String.raw`a\,b`), { focus: { slot: 'root', index: 2 } })?.latex).toBe('ab');
  });

  it('inserts pasted LaTeX as structure and rejects incomplete LaTeX', () => {
    expect(insertMathVisualText(doc('y='), end('y='), String.raw`\frac{a}{b}`)?.latex).toBe(String.raw`y=\frac{a}{b}`);
    expect(insertMathVisualText(doc('y='), end('y='), String.raw`\frac{a}{`)).toBeNull();
  });

  it('appends after the last child rather than inside a trailing comment', () => {
    expect(insertMathVisualText(doc('x %note'), end('x %note'), 'y')?.latex).toBe('xy %note');
  });
});

describe('script templates extend existing scripts', () => {
  it('adds a superscript to a subscripted atom', () => {
    const sub = insertMathVisualTemplate(doc('x'), end('x'), template('subscript'))!;
    const filled = insertMathVisualText(doc(sub.latex), sub.selection, '1')!;
    const after = { focus: { slot: 'root', index: 1 } };
    const sup = insertMathVisualTemplate(doc(filled.latex), after, template('superscript'))!;
    expect(sup.latex).toBe('{x}_{1}^{}');
    expect(sup.selection.focus.slot).toBe('root/0/superscript');
  });

  it('continues an existing superscript instead of nesting', () => {
    const edit = insertMathVisualTemplate(doc('x^{2}'), end('x^{2}'), template('superscript'))!;
    expect(edit).toEqual({ latex: 'x^{2}', selection: { focus: { slot: 'root/0/superscript', index: 1 } } });
  });

  it('adds powers to functions and operators without an operand, leaving the caret after them', () => {
    expect(insertMathVisualTemplate(doc(String.raw`\sin`), end(String.raw`\sin`), template('square'))).toEqual({ latex: String.raw`\sin^{2}`, selection: end(String.raw`\sin`) });
    expect(insertMathVisualTemplate(doc(String.raw`\sum`), end(String.raw`\sum`), template('subscript'))?.selection.focus.slot).toBe('root/0/lower');
    expect(insertMathVisualTemplate(doc('x_1'), end('x_1'), template('cube'))?.latex).toBe('x_1^{3}');
  });
});
