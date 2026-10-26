import { describe, expect, it } from 'vitest';
import { parseMathLatex } from './parse';
import { getMathVisualSlots } from '../visual/slots';
import { insertMathVisualText, deleteMathVisual } from '../visual/edit';
import { moveMathVisual } from '../visual/navigation';
import { renderMathML } from '../output/mathml';
import { formatMathSlotLabel } from '../visual/labels';

/**
 * Parses a complete admitted fixture, retaining its original source.
 * @param source - Exact author formula.
 * @returns Complete formula document.
 */
function document(source: string) {
  const result = parseMathLatex(source);
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.document;
}

describe('extended structural formula grammar', () => {
  it('owns integral bounds and body rather than inserting an uneditable glyph', () => {
    const source = String.raw`\int_{0}^{1}{x^{2}}dx`;
    const doc = document(source);
    expect(doc.latex).toBe(source);
    expect(doc.root.children[0]).toMatchObject({ kind: 'operator', name: 'int', placement: 'side' });
    expect(getMathVisualSlots(doc).map(slot => formatMathSlotLabel(slot))).toEqual(['公式', '下限', '上限', '运算内容', '底数', '上标']);
    const edit = insertMathVisualText(doc, { focus: { slot: 'root/0/upper', index: 1 }, anchor: { slot: 'root/0/upper', index: 0 } }, '3');
    expect(edit?.latex).toBe(String.raw`\int_{0}^{3}{x^{2}}dx`);
    expect(renderMathML(doc)).toContain('<msubsup>');
  });
  it('preserves explicit limit placement and supports nested sums and functions', () => {
    const source = String.raw`\sum_{n=1}^{N}{\sin{a_n}}+\int\limits_{a}^{b}{f(x)}`;
    const doc = document(source);
    expect(doc.root.children[0]).toMatchObject({ kind: 'operator', placement: 'above-below' });
    expect(renderMathML(doc)).toContain('<munderover>');
    const body = { focus: { slot: 'root/0/body', index: 0 } };
    expect(moveMathVisual(doc, body, 'up').focus.slot).toBe('root/0/upper');
    expect(moveMathVisual(doc, body, 'down').focus.slot).toBe('root/0/lower');
    expect(document(String.raw`\sum\nolimits_{n=0}^{3}{n}`).root.children[0]).toMatchObject({ placement: 'side' });
  });
  it('keeps function names upright and makes arguments and logarithm bases editable', () => {
    const doc = document(String.raw`\log_{2}{\cos^{2}{x}}+\lim_{x\to0}{\frac{\sin{x}}{x}}`);
    expect(doc.root.children[0]).toMatchObject({ kind: 'function', name: 'log' });
    expect(getMathVisualSlots(doc).some(slot => slot.id === 'root/0/argument/0/argument')).toBe(true);
    expect(renderMathML(doc)).toContain('<mi mathvariant="normal">cos</mi>');
  });
  it('projects fences and accents to editable content with safe source boundaries', () => {
    const source = String.raw`\left(\hat{x}+\overrightarrow{AB}\right)`;
    const doc = document(source);
    const slot = getMathVisualSlots(doc).find(item => item.id === 'root/0/content')!;
    expect(source.slice(slot.from, slot.to)).toBe(String.raw`\hat{x}+\overrightarrow{AB}`);
    const edit = insertMathVisualText(doc, { focus: { slot: slot.id, index: 3 } }, '+1');
    expect(edit?.latex).toBe(String.raw`\left(\hat{x}+\overrightarrow{AB}+1\right)`);
    expect(renderMathML(doc)).toContain('stretchy="true"');
    expect(document(String.raw`\overbrace{a+b}^{n}`).root.children[0]).toMatchObject({ kind: 'accent', annotation: { children: [{ value: 'n' }] } });
  });
  it('edits matrix cells without consuming row and column separators', () => {
    const source = String.raw`\begin{bmatrix}a&b\\c&d\end{bmatrix}`;
    const doc = document(source);
    expect(doc.root.children[0]).toMatchObject({ kind: 'matrix', environment: 'bmatrix', rows: [[{ children: [{ value: 'a' }] }, { children: [{ value: 'b' }] }], [{ children: [{ value: 'c' }] }, { children: [{ value: 'd' }] }]] });
    const edit = insertMathVisualText(doc, { focus: { slot: 'root/0/cell-0-1', index: 1 } }, '2');
    expect(edit?.latex).toBe(String.raw`\begin{bmatrix}a&b2\\c&d\end{bmatrix}`);
    expect(moveMathVisual(doc, { focus: { slot: 'root/0/cell-0-1', index: 1 } }, 'down').focus.slot).toBe('root/0/cell-1-1');
    expect(moveMathVisual(doc, { focus: { slot: 'root/0/cell-1-0', index: 0 } }, 'previous').focus.slot).toBe('root/0/cell-0-1');
    expect(renderMathML(doc)).toContain('<mtable ');
  });
  it('deletes a whole nested operator with one confirmation, then preserves valid source', () => {
    const doc = document(String.raw`1+\sum_{n=1}^{N}{a_n}`);
    const selected = deleteMathVisual(doc, { focus: { slot: 'root', index: 3 } })!;
    expect(selected.latex).toBe(doc.latex);
    expect(deleteMathVisual(doc, selected.selection)?.latex).toBe('1+');
  });
  it.each([
    String.raw`\sum_1_2{x}`, String.raw`\sum\sideways{x}`, String.raw`\sin^2^3 x`, String.raw`\overbrace{x}^{n}^{m}`,
    String.raw`\left(x`, String.raw`\left(x\right`, String.raw`\right)`, String.raw`x\middle|y`,
    String.raw`\begin{unknown}a\end{unknown}`, String.raw`\begin{cases}a&b&c\end{cases}`,
    String.raw`\begin{matrix}a\end{pmatrix}`, String.raw`\begin{array}{c}a&b\end{array}`,
    String.raw`a\over b\over c`, String.raw`\def\x{a}`, String.raw`\href{x}{y}`,
  ])('rejects the entire unsupported or incomplete structure: %s', source => {
    const result = parseMathLatex(source);
    expect(result.ok).toBe(false);
    expect('document' in result).toBe(false);
  });
  it('bounds matrix dimensions and does not hide unsupported commands inside cells', () => {
    expect(parseMathLatex(String.raw`\begin{matrix}` + Array(33).fill('x').join('&') + String.raw`\end{matrix}`).ok).toBe(false);
    expect(parseMathLatex(String.raw`\begin{matrix}\unknown{}\end{matrix}`).ok).toBe(false);
  });
});
