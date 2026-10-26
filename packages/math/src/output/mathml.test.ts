import { describe, expect, it } from 'vitest';
import { parseMathLatex } from '../latex/parse';
import { renderMathML } from './mathml';

/**
 * Renders a supported author source for assertions.
 * @param source - Formula source.
 * @returns Complete MathML markup.
 */
function render(source: string): string {
  const parsed = parseMathLatex(source);
  if (!parsed.ok) throw new Error(parsed.diagnostic.message);
  return renderMathML(parsed.document);
}
describe('safe structural MathML output', () => {
  it('keeps fraction and explicit root degree roles', () => {
    const output = render(String.raw`\frac{x_1}{\sqrt[3]{y^2}}`);
    expect(output).toContain('<mfrac>');
    expect(output).toContain('<msub><mi>x</mi><mrow><mn>1</mn></mrow></msub>');
    expect(output).toContain('<mroot>');
    expect(output).toContain('<msup><mi>y</mi><mrow><mn>2</mn></mrow></msup>');
  });
  it('distinguishes square roots and combined scripts', () => {
    expect(render(String.raw`\sqrt{x_1^2}`)).toContain('<msqrt><mrow data-math-radicand="true"><mrow><msubsup>');
  });
  it('keeps empty slots empty', () => {
    expect(render(String.raw`\frac{}{}`)).toContain('<mfrac><mrow></mrow><mrow></mrow></mfrac>');
  });
  it('escapes author content instead of emitting HTML', () => {
    expect(render('<img>')).toContain('<mo>&lt;</mo>');
    expect(render('<img>')).not.toContain('<img>');
  });
  it('makes block display an explicit caller choice', () => {
    const parsed = parseMathLatex('x');
    if (!parsed.ok) throw new Error('Invalid test source');
    expect(renderMathML(parsed.document, { display: 'block' })).toContain('display="block"');
    expect(renderMathML(parsed.document)).toContain('display="inline"');
  });
});
