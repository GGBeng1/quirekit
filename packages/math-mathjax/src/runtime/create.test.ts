import { describe, expect, it } from 'vitest';
import { getMathVisualSlots, mathSymbolCommands, mathTemplates, parseMathLatex } from '@quirekit/math';
import type { MathDocument } from '@quirekit/math';
import { createMathJaxRenderer } from './create';
import { serializeMathSvg } from '../output/svg';

/**
 * Uses the admitted parser as the input authority for layout acceptance fixtures.
 * @param source - Exact supported formula source.
 * @returns Complete admitted document.
 */
function formula(source: string): MathDocument {
  const result = parseMathLatex(source);
  if (!result.ok) throw new Error(result.diagnostic.message);
  return result.document;
}

describe('MathJax formula graphic and editing geometry', () => {
  const renderer = createMathJaxRenderer();
  it.each(mathTemplates)('lays out every editable template: $id', async template => {
    const document = formula(template.pattern.replace('◊', ''));
    const value = await renderer.render(document, { editable: true });
    expect(value.svg).toContain('data-math-renderer="mathjax"');
    expect(value.svg).not.toMatch(/<text\b|merror|<use\b/u);
    expect(value.width).toBeGreaterThan(0);
    expect(value.height).toBeGreaterThan(0);
    expect(value.slots.map(slot => slot.id)).toEqual(getMathVisualSlots(document).map(slot => slot.id));
    for (const slot of value.slots) {
      expect(slot.boundaries).toHaveLength(slot.children.length + 1);
      expect(slot.rect.width).toBeGreaterThanOrEqual(0);
      expect(slot.rect.height).toBeGreaterThan(0);
      expect(slot.boundaries.every(Number.isFinite)).toBe(true);
      expect(slot.boundaries).toEqual([...slot.boundaries].sort((a, b) => a - b));
      if (!slot.children.length) expect(slot.emptyCenter).toBeGreaterThanOrEqual(slot.rect.left);
    }
  });

  it.each(Object.keys(mathSymbolCommands))('renders a supported symbol without text fallback: %s', async name => {
    const value = await renderer.render(formula(`\\${name}`));
    expect(value.svg).not.toMatch(/<text\b|merror/u);
    expect(value.slots).toHaveLength(0);
  });

  it('projects real numerator, denominator, scripts and character advances', async () => {
    const value = await renderer.render(formula(String.raw`\frac{ab}{c}+x^{xx}`), { editable: true });
    const numerator = value.slots.find(slot => slot.id.endsWith('/numerator'))!;
    const denominator = value.slots.find(slot => slot.id.endsWith('/denominator'))!;
    const exponent = value.slots.find(slot => slot.id.endsWith('/superscript'))!;
    const base = value.slots.find(slot => slot.id.endsWith('/base'))!;
    expect(numerator.rect.top + numerator.rect.height).toBeLessThan(denominator.rect.top);
    expect(numerator.boundaries[1]).toBeGreaterThan(numerator.boundaries[0]!);
    expect(numerator.boundaries[2]).toBeGreaterThan(numerator.boundaries[1]!);
    expect(exponent.rect.height).toBeLessThan(base.rect.height);
    expect(exponent.rect.top).toBeLessThan(base.rect.top);
    expect(value.baseline).toBeGreaterThan(0);
    expect(value.baseline).toBeLessThan(value.height);
  });

  it('centers empty caret targets without creating an artificial boundary width', async () => {
    const value = await renderer.render(formula(String.raw`\frac{}{}`), { editable: true });
    for (const slot of value.slots.filter(slot => slot.id !== 'root')) {
      expect(slot.children).toHaveLength(0);
      expect(slot.boundaries).toHaveLength(1);
      expect(slot.emptyCenter).toBeCloseTo(slot.rect.left + slot.rect.width / 2, 4);
    }
  });

  it('retains token semantics when the engine reuses parent groups for text wrappers', async () => {
    const value = await renderer.render(formula(String.raw`\sqrt{x}+12`));
    expect(value.svg).toMatch(/data-mml-node="mi"[^>]*data-math-text="x"/u);
    expect(value.svg).toMatch(/data-mml-node="mn"[^>]*data-math-text="1"/u);
    expect(value.svg).toMatch(/data-mml-node="mn"[^>]*data-math-text="2"/u);
    expect(value.svg.match(/<path[^>]*data-c=[^>]*>/gu)?.every(path => path.includes('stroke-width="3"'))).toBe(true);
  });

  it('shares duplicate requests, keeps exact source and evicts under explicit limits', async () => {
    const local = createMathJaxRenderer({ maxEntries: 1, maxBytes: 100_000 });
    const a = formula('a');
    const [first, second] = await Promise.all([local.render(a), local.render(a)]);
    expect(first).toBe(second);
    await local.render(formula('b'));
    expect(local.getStats()).toMatchObject({ layouts: 2, hits: 1, entries: 1 });
    await local.render(a);
    expect(local.getStats().layouts).toBe(3);
    expect(a.latex).toBe('a');
    expect(Object.isFrozen(first)).toBe(true);
    local.dispose();
  });

  it('does not retain oversized results or publish after disposal', async () => {
    const local = createMathJaxRenderer({ maxBytes: 1 });
    await local.render(formula('x'));
    expect(local.getStats()).toMatchObject({ entries: 0, bytes: 0 });
    const pending = local.render(formula('y'));
    local.dispose();
    await expect(pending).rejects.toThrow('disposed');
    await expect(local.render(formula('z'))).rejects.toThrow('disposed');
  });

  it('bounds distinct pending conversions while allowing duplicate reuse', async () => {
    const local = createMathJaxRenderer({ maxPending: 1 });
    const pending = local.render(formula('x'));
    const duplicate = local.render(formula('x'));
    expect(local.getStats().pending).toBe(1);
    await expect(local.render(formula('y'))).rejects.toThrow('queue is full');
    expect(await duplicate).toBe(await pending);
    await local.render(formula('y'));
    expect(local.getStats()).toMatchObject({ layouts: 2, hits: 1, pending: 0 });
    local.dispose();
  });

  it('exports a standalone image with resolved dimensions, no editable placeholders or external references', async () => {
    const value = await renderer.render(formula(String.raw`\sqrt{x}+\frac{a}{b}`));
    const svg = serializeMathSvg(value, { fontSize: 32, color: '#1463ff' });
    expect(svg).toContain('color="#1463ff"');
    expect(svg).toContain(`width="${value.width * 32}px"`);
    expect(svg).not.toMatch(/data-math-slot|data-math-placeholder|href=|url\(/u);
    const editable = await renderer.render(formula(''), { editable: true });
    expect(() => serializeMathSvg(editable, { fontSize: 32 })).toThrow('presentation-only');
  });
});

describe('MathJax layout of compliant LaTeX structures', () => {
  const renderer = createMathJaxRenderer();
  it.each([
    String.raw`\sum_{i=1}^n a_i`, String.raw`\sin^2 x+\cos x`, String.raw`\lim_{x\to 0} \frac{\sin x}{x}`, String.raw`\int_0^1 x\,dx`,
    String.raw`\left[a,b\right)`, String.raw`\left( \frac{a}{b} \middle| c \right)`, String.raw`\mathbb{R}^n\mathcal{L}\mathfrak{g}\mathscr{F}`,
    String.raw`\operatorname*{arg\,max}_x f(x)`, String.raw`f(x)=\begin{cases} x & \text{if } x\ge 0 \\ -x & \text{otherwise} \end{cases}`,
    String.raw`\text{for all $x$ in } S`, String.raw`\dfrac{1}{2}+\binom{n}{k}+{n \choose k}+a \over b`,
    String.raw`\begin{aligned} a &= b + c \\ &= d \end{aligned}`, String.raw`\begin{array}{c|cc} \hline a & b & c \\ \hline \end{array}`,
    String.raw`\sum_{\substack{0<i<m \\ 0<j<n}} P(i,j)`, String.raw`A \xrightarrow[\text{below}]{f} B \stackrel{\text{def}}{=}`,
    String.raw`\boxed{E=mc^2}\phantom{x}\hphantom{y}\vphantom{z} a \equiv b \pmod{n}`, String.raw`\big( \Big[ \bigg\{ \Bigg|`,
    String.raw`x \not= y \not\in A \not\prec B`, String.raw`\displaystyle\sum_{n} a_n`, String.raw`x \quad y \; z \! w`,
    String.raw`\limsup_{n\to\infty} a_n \bigoplus_i V_i \iiiint f`, String.raw`E = mc^2 \tag{1}`, String.raw`\dddot{x}\mathring{A}`,
    String.raw`v=\text{速度}`,
  ])('renders %s without math-font fallback in both projections', async source => {
    const document = formula(source);
    for (const editable of [false, true]) {
      const value = await renderer.render(document, { editable });
      expect(value.width).toBeGreaterThan(0);
      if (editable) expect(value.slots.map(slot => slot.id)).toEqual(getMathVisualSlots(document).map(slot => slot.id));
    }
  });

  it('lets prose text fall back to a system font but rejects a missing mathematical glyph', async () => {
    const text = await renderer.render(formula(String.raw`\text{中文}`));
    expect(text.svg).toMatch(/<text\b/u);
    await expect(renderer.render(formula('中'))).resolves.toBeDefined();
    await expect(renderer.render(formula('😀'))).resolves.toBeDefined();
  });

  it('applies font commands to identifiers', async () => {
    const plain = await renderer.render(formula('R'));
    const doubleStruck = await renderer.render(formula(String.raw`\mathbb{R}`));
    expect(doubleStruck.svg).not.toBe(plain.svg.replace(/aria-label="[^"]*"/u, ''));
    expect(doubleStruck.svg).toContain('data-c="211D"');
  });

  it('shares editable layouts across source spellings without leaking a source label', async () => {
    const local = createMathJaxRenderer();
    const first = await local.render(formula('x+y'), { editable: true });
    const second = await local.render(formula('x + y'), { editable: true });
    expect(second).toBe(first);
    expect(first.svg).toContain('aria-hidden="true"');
    expect(first.svg).not.toContain('aria-label="x+y"');
    local.dispose();
  });
});

describe('standalone SVG export', () => {
  it('keeps attribute values well-formed XML so the image decodes as SVG', async () => {
    const renderer = createMathJaxRenderer();
    const value = await renderer.render(formula(String.raw`f(x)=\begin{cases} x & x\ge 0 \\ -x & x<0 \end{cases}`));
    const svg = serializeMathSvg(value, { fontSize: 16 });
    for (const [, attribute] of svg.matchAll(/="([^"]*)"/gu)) expect(attribute).not.toMatch(/[<>]/u);
    expect(svg).toContain('x&lt;0');
    renderer.dispose();
  });
});

