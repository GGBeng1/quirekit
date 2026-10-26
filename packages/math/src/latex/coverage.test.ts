import { describe, expect, it } from 'vitest';
import { parseMathLatex } from './parse';
import { renderMathML } from '../output/mathml';
import { getMathVisualSlots } from '../visual/slots';

/**
 * Parses a formula that standard LaTeX accepts.
 * @param source - Compliant LaTeX math.
 * @returns Complete formula document.
 */
function document(source: string) {
  const result = parseMathLatex(source);
  if (!result.ok) throw new Error(`${source}: ${result.diagnostic.message} at ${result.diagnostic.offset}`);
  return result.document;
}

describe('compliant LaTeX coverage', () => {
  it.each([
    String.raw`\sum_{i=1}^n a_i`, String.raw`\sin x`, String.raw`\sin^2 x+\cos^2 x=1`, String.raw`\lim_{x\to 0} \frac{\sin x}{x}=1`,
    String.raw`\int_0^1 x\,dx`, String.raw`\iint_D f(x,y)\,dA`, String.raw`\{x \mid x>0\}`, String.raw`\left[a,b\right)`,
    String.raw`\left.\frac{df}{dx}\right|_{x=0}`, String.raw`\left\langle u, v \right\rangle`, String.raw`\left( \frac{a}{b} \middle| c \right)`,
    String.raw`\mathbb{R}^n`, String.raw`\mathbb R`, String.raw`\mathcal{L}\{f\}`, String.raw`\mathrm{d}x`, String.raw`\operatorname{rank} A`,
    String.raw`\operatorname*{arg\,max}_x f(x)`, String.raw`f(x)=\begin{cases} x & \text{if } x\ge 0 \\ -x & \text{otherwise} \end{cases}`,
    String.raw`\text{for all $x$ in } S`, String.raw`\dfrac{1}{2}+\tfrac12+\binom{n}{k}`, String.raw`{n \choose k}`, String.raw`a \over b`,
    String.raw`\begin{aligned} a &= b + c \\ &= d \end{aligned}`, String.raw`\begin{align*} x &= 1 \\ y &= 2 \end{align*}`,
    String.raw`\begin{pmatrix} 1 & 2 \\ 3 \end{pmatrix}`, String.raw`\begin{bmatrix} a \\ b \\ \end{bmatrix}`,
    String.raw`\begin{array}{c|cc} \hline a & b & c \\ \hline \end{array}`, String.raw`\begin{gathered} a \\[2pt] b \end{gathered}`,
    String.raw`\sum_{\substack{0<i<m \\ 0<j<n}} P(i,j)`, String.raw`A \xrightarrow[\text{below}]{f} B`, String.raw`\stackrel{\text{def}}{=}`,
    String.raw`\boxed{E=mc^2}`, String.raw`\phantom{x}`, String.raw`a \equiv b \pmod{n}`, String.raw`a \bmod b`,
    String.raw`\big( \Big[ \bigg\{ \Bigg| \bigl( \bigr)`, String.raw`x \not= y \not\in A`, String.raw`\displaystyle\sum_{n} a_n`,
    String.raw`x \quad y \qquad z \; w \: v \! u \ t ~ s`, String.raw`\# \$ \% \& \_ \| \backslash`, String.raw`f'(x) \leq g''(x)`,
    String.raw`x^2 % a trailing comment`, String.raw`\vec{v}\cdot\hat{n} \to \infty`, String.raw`\hbar\nabla^2\psi`,
    String.raw`E = mc^2 \tag{1}\label{eq:energy}`, String.raw`\sqrt[3]{x}\sqrt x`, String.raw`\overbrace{a+\cdots+a}^{n}`,
    String.raw`\Pr(A\cap B)\le\min(\Pr A,\Pr B)`, String.raw`\limsup_{n\to\infty} a_n`, String.raw`\bigoplus_{i} V_i`,
  ])('accepts %s', source => {
    const doc = document(source);
    expect(doc.latex).toBe(source);
    expect(renderMathML(doc)).toMatch(/^<math /u);
    expect(getMathVisualSlots(doc)[0]?.id).toBe('root');
  });

  it('keeps an operand after a script-less group as ordinary following content', () => {
    expect(document(String.raw`\sum_{i} a_i`).root.children.map(child => child.kind)).toEqual(['operator', 'scripts']);
    expect(document(String.raw`\sin x`).root.children[0]).not.toHaveProperty('argument');
    expect(document(String.raw`\sin{x}`).root.children[0]).toHaveProperty('argument');
    // TeX gives a group followed by a script to that script.
    expect(document(String.raw`\sin{x}^{2}`).root.children.map(child => child.kind)).toEqual(['function', 'scripts']);
  });

  it('splits an infix fraction into editable numerator and denominator', () => {
    const fraction = document(String.raw`a+b \over c`).root.children[0];
    expect(fraction).toMatchObject({ kind: 'fraction', command: 'over', numerator: { children: [{ value: 'a' }, { value: '+' }, { value: 'b' }] }, denominator: { children: [{ value: 'c' }] } });
  });

  it('decodes text runs and exposes nested formulas as slots', () => {
    const doc = document(String.raw`\text{if $x>0$ and \{y\}}`);
    const text = doc.root.children[0];
    expect(text).toMatchObject({ kind: 'text', parts: [{ kind: 'run', value: 'if ' }, { kind: 'sequence', boundary: 'dollar' }, { kind: 'run', value: ' and {y}' }] });
    expect(getMathVisualSlots(doc).map(slot => slot.id)).toEqual(['root', 'root/0/math-1']);
  });

  it('renders environments, styles and sized delimiters to explicit MathML', () => {
    expect(renderMathML(document(String.raw`\begin{aligned}a&=b\end{aligned}`))).toContain('columnalign="right left"');
    const array = renderMathML(document(String.raw`\begin{array}{c|c}\hline a&b\\c&d\end{array}`));
    expect(array).toContain('columnlines="solid"');
    expect(array).toContain('<menclose notation="top">');
    expect(renderMathML(document(String.raw`\mathbb{R}`))).toContain('mathvariant="double-struck"');
    expect(renderMathML(document(String.raw`\binom{n}{k}`))).toContain('linethickness="0"');
    expect(renderMathML(document(String.raw`\Big(`))).toContain('minsize="1.623em"');
    expect(renderMathML(document(String.raw`\displaystyle\frac12`))).toContain('<mstyle displaystyle="true"');
    expect(renderMathML(document(String.raw`\text{a  b}`))).toContain('a&#xA0;b');
    expect(renderMathML(document(String.raw`f(x)=\begin{cases}a\\b\end{cases}`))).toContain('<mo stretchy="false">(</mo>');
    expect(renderMathML(document(String.raw`\left(x\right)`))).toContain('<mo fence="true" stretchy="true">(</mo>');
  });

  it('reports unsupported or invalid TeX with an exact position', () => {
    expect(parseMathLatex(String.raw`x+\newcommand{\a}{b}`)).toMatchObject({ ok: false, diagnostic: { code: 'unsupported-command', offset: 2 } });
    expect(parseMathLatex(String.raw`x^2^3`)).toMatchObject({ ok: false, diagnostic: { code: 'duplicate-script' } });
    expect(parseMathLatex(String.raw`\text{a^b}`)).toMatchObject({ ok: false });
    expect(parseMathLatex(String.raw`\begin{equation}a\\b\end{equation}`)).toMatchObject({ ok: false });
  });
});
