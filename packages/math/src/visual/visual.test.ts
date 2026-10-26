import { describe, expect, it } from 'vitest';
import { parseMathLatex } from '../latex/parse';
import { mathTemplates } from '../templates/catalog';
import { deleteMathVisual, insertMathVisualTemplate, insertMathVisualText } from './edit';
import { getMathVisualSlots } from './slots';
import { moveMathVisual } from './navigation';

/**
 * Loads a valid fixture source.
 * @param source - Supported formula.
 * @returns Complete formula document.
 */
function doc(source: string) { const result = parseMathLatex(source); if (!result.ok) throw new Error(result.diagnostic.message); return result.document; }
describe('structural visual authoring', () => {
  it('creates and fills a fraction without source syntax input', () => {
    const inserted = insertMathVisualTemplate(doc(''), { focus: { slot: 'root', index: 0 } }, mathTemplates[0]!)!;
    expect(inserted).toMatchObject({ latex: String.raw`\frac{}{}`, selection: { focus: { slot: 'root/0/numerator', index: 0 } } });
    const numerator = insertMathVisualText(doc(inserted.latex), inserted.selection, 'x+1')!;
    const lower = moveMathVisual(doc(numerator.latex), numerator.selection, 'down');
    expect(lower.focus.slot).toBe('root/0/denominator');
    expect(insertMathVisualText(doc(numerator.latex), lower, '2')?.latex).toBe(String.raw`\frac{x+1}{2}`);
  });
  it('protects unbraced script arguments from edits escaping their slots', () => {
    const document = doc(' x^2 + y ');
    const slot = getMathVisualSlots(document).find(item => item.role === 'superscript')!;
    const changed = insertMathVisualText(document, { focus: { slot: slot.id, index: 1 } }, '3')!;
    expect(changed.latex).toBe(' x^{23} + y ');
    expect(changed.selection.focus.slot).toBe(slot.id);
    expect(changed.selection.focus.index).toBe(2);
  });
  it('replaces a same-slot selection and preserves named symbols elsewhere', () => {
    const changed = insertMathVisualText(doc(String.raw`\alpha+x`), { focus: { slot: 'root', index: 3 }, anchor: { slot: 'root', index: 2 } }, 'y');
    expect(changed?.latex).toBe(String.raw`\alpha+y`);
  });
  it('selects structures before removing them and deletes symbols atomically', () => {
    const source = String.raw`\frac{x}{y}`;
    const selected = deleteMathVisual(doc(source), { focus: { slot: 'root', index: 1 } })!;
    expect(selected.latex).toBe(source);
    expect(selected.selection.anchor).toBeDefined();
    expect(deleteMathVisual(doc(source), selected.selection)?.latex).toBe('');
    expect(deleteMathVisual(doc('𝑥'), { focus: { slot: 'root', index: 1 } })?.latex).toBe('');
  });
  it('keeps named symbol commands separated during visual edits', () => {
    expect(insertMathVisualText(doc(String.raw`\alpha`), { focus: { slot: 'root', index: 1 } }, 'x')?.latex).toBe(String.raw`\alpha x`);
    expect(deleteMathVisual(doc(String.raw`\alpha+x`), { focus: { slot: 'root', index: 2 } })?.latex).toBe(String.raw`\alpha x`);
  });
  it('rejects raw syntax instead of exposing a partial visual edit', () => {
    expect(insertMathVisualText(doc('x'), { focus: { slot: 'root', index: 1 } }, String.raw`\bad`)).toBeNull();
  });
  it('enters nested arguments and exits without visiting syntax characters', () => {
    const document = doc(String.raw`\frac{}{}`);
    const entered = moveMathVisual(document, { focus: { slot: 'root', index: 0 } }, 'right');
    expect(entered.focus.slot).toBe('root/0/numerator');
    expect(moveMathVisual(document, entered, 'next').focus.slot).toBe('root/0/denominator');
    expect(moveMathVisual(document, entered, 'right').focus.slot).toBe('root/0/denominator');
    expect(moveMathVisual(document, entered, 'left').focus).toEqual({ slot: 'root', index: 0 });
  });
});

it('power presets retain an empty base or return after a completed preceding atom', () => {
  for (const id of ['square', 'cube']) {
    const template = mathTemplates.find(item => item.id === id)!;
    const empty = insertMathVisualTemplate(doc(''), { focus: { slot: 'root', index: 0 } }, template)!;
    expect(empty.selection.focus.slot).toBe('root/0/base');
    const completed = insertMathVisualTemplate(doc('x+y'), { focus: { slot: 'root', index: 3 } }, template)!;
    expect(completed.selection.focus).toEqual({ slot: 'root', index: 3 });
    expect(insertMathVisualText(doc(completed.latex), completed.selection, '+1')?.latex).toBe(`x+{y}^{${id === 'square' ? 2 : 3}}+1`);
  }
});
