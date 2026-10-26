import { describe, expect, it } from 'vitest';
import { sameOmml } from './compare';
import { latexToOmml } from './latex';
import { ommlToLatex } from './omml-to-latex';

describe('OMML structural whitespace', () => {
  it('ignores XML indentation outside text but preserves spaces inside math text', () => {
    const plain = { 'm:oMath': [{ 'm:r': [{ 'm:t': [{ '#text': 'x' }] }] }] };
    const pretty = { 'm:oMath': [{ '#text': '\n\t' }, { 'm:r': [{ '#text': '\n  ' }, { 'm:t': [{ '#text': 'x' }] }] }, { '#text': '\n' }] };
    expect(sameOmml(plain, pretty)).toBe(true);
    expect(ommlToLatex(pretty)).toEqual({ ok: true, latex: 'x' });
    expect(sameOmml(plain, { 'm:oMath': [{ 'm:r': [{ 'm:t': [{ '#text': ' x' }] }] }] })).toBe(false);
    expect(sameOmml(plain, { 'm:oMath': [...plain['m:oMath'], { '#text': 'unexpected' }] })).toBe(false);
    const spaced = latexToOmml('\\text{a b}');
    if (!spaced.ok) throw new Error(spaced.diagnostic.message);
    expect(ommlToLatex(spaced.element)).toEqual({ ok: true, latex: '\\text{a b}' });
  });
});
