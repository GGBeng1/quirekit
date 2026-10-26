import { describe, expect, it } from 'vitest';
import { parseMathLatex } from './parse';

describe('strict formula parsing', () => {
  it('keeps author source while parsing nested fractions and roots', () => {
    const source = String.raw` \frac{x_1}{\sqrt[3]{\alpha+y^{2}}} `;
    const result = parseMathLatex(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.latex).toBe(source);
    expect(result.document.root.children[0]?.kind).toBe('fraction');
  });
  it.each([String.raw`\unknown{x}`, String.raw`\def\x{a}`, 'x^2^3', '{x', 'x}', '^x', 'x&y', 'x$y'])('rejects the whole input: %s', (source) => {
    const result = parseMathLatex(source);
    expect(result.ok).toBe(false);
    expect('document' in result).toBe(false);
  });
  it('allows empty template slots without inventing visible text', () => {
    const result = parseMathLatex(String.raw`\frac{}{}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fraction = result.document.root.children[0];
    expect(fraction).toMatchObject({ kind: 'fraction', numerator: { children: [] }, denominator: { children: [] } });
  });
  it('reports an exact UTF-16 source offset after supplementary symbols', () => {
    const result = parseMathLatex(String.raw`𝑥+\bad`);
    expect(result).toMatchObject({ ok: false, diagnostic: { code: 'unsupported-command', offset: 3 } });
  });
  it('bounds nesting and source size before accepting content', () => {
    expect(parseMathLatex('{'.repeat(70) + 'x' + '}'.repeat(70)).ok).toBe(false);
    expect(parseMathLatex('x'.repeat(17000)).ok).toBe(false);
  });
  it('does not merge subscript and superscript roles', () => {
    const result = parseMathLatex('x_1^2');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root.children[0]).toMatchObject({ kind: 'scripts', subscript: { children: [{ value: '1' }] }, superscript: { children: [{ value: '2' }] } });
  });
});
