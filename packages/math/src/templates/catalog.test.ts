import { describe, expect, it } from 'vitest';
import { mathTemplates } from './catalog';
import { createMathMatrixTemplate } from './matrix';
import { parseMathLatex } from '../latex/parse';
import { insertMathVisualTemplate, insertMathVisualText } from '../visual/edit';
import { getMathVisualSlots } from '../visual/slots';
import { renderEditableMathML } from '../output/editable-mathml';
import { renderMathML } from '../output/mathml';

describe('complete visual template catalog', () => {
  it('has unique bilingual identities with no unsupported preview or opaque template', () => {
    expect(new Set(mathTemplates.map(item => item.id)).size).toBe(mathTemplates.length);
    expect(new Set(mathTemplates.map(item => item.label)).size).toBe(mathTemplates.length);
    expect(mathTemplates.length).toBeGreaterThan(100);
    for (const template of mathTemplates) {
      expect(template.english, template.id).toBeTruthy();
      expect(template.pattern.split('◊'), template.id).toHaveLength(2);
      expect(parseMathLatex(template.preview ?? template.pattern.replace('◊', '')).ok, template.id).toBe(true);
    }
  });
  it.each(mathTemplates)('inserts, projects and edits $id through its actual slots', template => {
    const empty = parseMathLatex('');
    if (!empty.ok) throw new Error('Invalid empty fixture.');
    const edit = insertMathVisualTemplate(empty.document, { focus: { slot: 'root', index: 0 } }, template);
    expect(edit, template.id).not.toBeNull();
    const result = parseMathLatex(edit!.latex);
    if (!result.ok) throw new Error(`${template.id}: ${result.diagnostic.message}`);
    const slots = getMathVisualSlots(result.document);
    const active = slots.find(slot => slot.id === edit!.selection.focus.slot)!;
    expect(active, template.id).toBeTruthy();
    expect(renderEditableMathML(result.document, edit!.selection)).toContain(`data-math-slot="${active.id}"`);
    expect(renderMathML(result.document, { placeholders: true })).toContain('<math');
    const changed = insertMathVisualText(result.document, edit!.selection, 'x');
    expect(changed, template.id).not.toBeNull();
    expect(parseMathLatex(changed!.latex).ok, template.id).toBe(true);
  });
  it('wraps selection in a definite integral body and focuses the lower limit first', () => {
    const parsed = parseMathLatex('x+1');
    if (!parsed.ok) throw new Error('Invalid fixture.');
    const edit = insertMathVisualTemplate(parsed.document, { anchor: { slot: 'root', index: 0 }, focus: { slot: 'root', index: 3 } }, mathTemplates.find(item => item.id === 'definite-integral')!);
    expect(edit).toEqual({ latex: String.raw`\int_{}^{}{x+1}`, selection: { focus: { slot: 'root/0/lower', index: 0 } } });
  });
  it('validates dynamic matrix size and retains every empty cell', () => {
    expect(createMathMatrixTemplate('bmatrix', 0, 2)).toBeNull();
    expect(createMathMatrixTemplate('bmatrix', 2, 9)).toBeNull();
    expect(createMathMatrixTemplate('cases', 2, 3)).toBeNull();
    const template = createMathMatrixTemplate('pmatrix', 3, 4)!;
    const parsed = parseMathLatex(template.pattern.replace('◊', ''));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(getMathVisualSlots(parsed.document).filter(slot => slot.id.includes('/cell-'))).toHaveLength(12);
  });
});
