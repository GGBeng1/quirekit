import type { MathAccent, MathExpression, MathFraction, MathMatrix, MathStyled, MathSwitch, MathSymbol, MathText } from '../model/types';
import { mathAccentCommands, mathEnvironments, mathExtensibleArrows, mathFractionCommands } from '../latex/commands';
import { mathStyleVariants, mathTextVariants } from '../latex/styles';
import { isMathTextScalar } from '../shared/script';
import { escapeXml } from './xml';

/** Renders one named editable role in the caller's projection. */
export type MathSlotMarkup = (role: string) => string;

const ordinary = new Set(['∞', '∂', '∇', '∅', 'ℏ', 'ℓ', '℘', 'ℜ', 'ℑ', 'ℵ', 'ℶ', 'ı', 'ȷ', '⊤', '♭', '♮', '♯', '♣', '♢', '♡', '♠', '△', '□', '◇', '°', '∠', '∡', '′']);
// Plain delimiters keep their natural size as in TeX; only `\left`, `\middle` and size commands stretch.
const plainDelimiters = new Set(['(', ')', '[', ']', '{', '}', '|', '‖', '⟨', '⟩', '⌊', '⌋', '⌈', '⌉', '/', '\\']);
const switchAttributes: Readonly<Record<MathSwitch['style'], string>> = Object.freeze({
  display: 'displaystyle="true" scriptlevel="0"', text: 'displaystyle="false" scriptlevel="0"',
  script: 'displaystyle="false" scriptlevel="1"', scriptscript: 'displaystyle="false" scriptlevel="2"',
});
const delimiterSizes = ['1.2em', '1.623em', '2.047em', '2.470em'] as const;

/**
 * Places optional lower/upper roles consistently in both formula projections.
 * @param base - Safe base markup.
 * @param lower - Optional lower markup.
 * @param upper - Optional upper markup.
 * @param aboveBelow - Whether limits sit above and below rather than at the side.
 * @returns Complete script structure.
 */
export function scripted(base: string, lower = '', upper = '', aboveBelow = false): string {
  const tag = lower && upper ? aboveBelow ? 'munderover' : 'msubsup' : lower ? aboveBelow ? 'munder' : 'msub' : upper ? aboveBelow ? 'mover' : 'msup' : undefined;
  return tag ? `<${tag}>${base}${lower}${upper}</${tag}>` : base;
}
/**
 * Wraps content in explicit, stretchable delimiters.
 * @param content - Safe structural content markup.
 * @param open - Opening glyph, or empty.
 * @param close - Closing glyph, or empty.
 * @returns Fenced row.
 */
export function fenced(content: string, open: string, close: string): string {
  const left = open ? `<mo fence="true" stretchy="true">${escapeXml(open)}</mo>` : '';
  const right = close ? `<mo fence="true" stretchy="true">${escapeXml(close)}</mo>` : '';
  return `<mrow>${left}${content}${right}</mrow>`;
}
/**
 * Applies a TeX style switch to one following sibling.
 * @param style - Active switch, if any.
 * @param markup - Sibling markup.
 * @returns Markup inside the matching `mstyle`.
 */
export function styledByMathSwitch(style: MathSwitch['style'] | undefined, markup: string): string {
  return style ? `<mstyle ${switchAttributes[style]}>${markup}</mstyle>` : markup;
}
/**
 * Finds the style switch in force before a child of a sequence.
 * @param children - Sequence children.
 * @param index - Child position.
 * @returns Latest preceding switch style.
 */
export function mathSwitchBefore(children: readonly MathExpression[], index: number): MathSwitch['style'] | undefined {
  for (let current = index - 1; current >= 0; current--) {
    const child = children[current]!;
    if (child.kind === 'switch') return child.style;
  }
  return undefined;
}
/**
 * Chooses the MathML token for one symbol.
 * @param expression - Admitted symbol.
 * @returns Token markup.
 */
export function symbolMarkup(expression: MathSymbol): string {
  const value = escapeXml(expression.value);
  if (/^\p{N}$/u.test(expression.value)) return `<mn>${value}</mn>`;
  if (isMathTextScalar(expression.value)) return `<mtext>${value}</mtext>`;
  if (/^\p{L}$/u.test(expression.value)) return `<mi>${value}</mi>`;
  if (ordinary.has(expression.value)) return `<mi mathvariant="normal">${value}</mi>`;
  if (plainDelimiters.has(expression.value)) return `<mo stretchy="false">${value}</mo>`;
  return `<mo>${value}</mo>`;
}
/**
 * Renders fraction-like commands, including binomials and display-style variants.
 * @param expression - Fraction.
 * @param slot - Editable role projection.
 * @returns Fraction markup.
 */
export function fractionMarkup(expression: MathFraction, slot: MathSlotMarkup): string {
  const preset = mathFractionCommands[expression.command];
  const fraction = `<mfrac${preset.rule ? '' : ' linethickness="0"'}>${slot('numerator')}${slot('denominator')}</mfrac>`;
  const enclosed = preset.parentheses ? `<mrow><mo>(</mo>${fraction}<mo>)</mo></mrow>` : fraction;
  return styledByMathSwitch(preset.style, enclosed);
}
/**
 * Renders accents, annotations and extensible arrows.
 * @param expression - Accent.
 * @param slot - Editable role projection.
 * @returns Accent markup.
 */
export function accentMarkup(expression: MathAccent, slot: MathSlotMarkup): string {
  const [mark, under, stretchy] = mathAccentCommands[expression.name];
  if (mathExtensibleArrows.has(expression.name)) {
    const arrow = `<mo stretchy="true" minsize="1.8em">${escapeXml(mark)}</mo>`;
    return expression.annotation ? `<munderover>${arrow}${slot('annotation')}${slot('content')}</munderover>` : `<mover>${arrow}${slot('content')}</mover>`;
  }
  const tag = under ? 'munder' : 'mover';
  const attribute = under ? 'accentunder' : 'accent';
  const accented = mark ? `<${tag} ${attribute}="true">${slot('content')}<mo stretchy="${stretchy}">${escapeXml(mark)}</mo></${tag}>` : slot('content');
  return expression.annotation ? `<${tag} ${attribute}="false">${accented}${slot('annotation')}</${tag}>` : accented;
}
/**
 * Renders alignment environments with their alignment, rules and delimiters.
 * @param expression - Environment.
 * @param slot - Editable role projection.
 * @returns Table markup.
 */
export function matrixMarkup(expression: MathMatrix, slot: MathSlotMarkup): string {
  const preset = mathEnvironments[expression.environment];
  const width = Math.max(...expression.rows.map(row => row.length));
  const columns = Array.from({ length: width }, (_, index) => expression.columns?.[index] ?? preset.align[index % preset.align.length]!);
  const attributes = [`columnalign="${columns.join(' ')}"`];
  if (preset.spacing) attributes.push(`columnspacing="${Array.from({ length: Math.max(1, width - 1) }, (_, index) => preset.spacing!.split(' ')[index % 2]).join(' ')}"`);
  const lines = expression.columnLines;
  if (lines?.slice(1, -1).some(Boolean)) attributes.push(`columnlines="${lines.slice(1, width).map(line => line ? 'solid' : 'none').join(' ')}"`);
  const rules = expression.rowLines ?? [];
  if (rules.some(rule => rule > 0 && rule < expression.rows.length)) {
    attributes.push(`rowlines="${expression.rows.slice(1).map((_, index) => rules.includes(index + 1) ? 'solid' : 'none').join(' ')}"`);
  }
  const rows = expression.rows.map((row, r) => `<mtr>${row.map((_, c) => `<mtd>${slot(`cell-${r}-${c}`)}</mtd>`).join('')}</mtr>`).join('');
  let table = `<mtable ${attributes.join(' ')}>${rows}</mtable>`;
  // Outer rules are borders of the whole table, not gaps between rows or columns.
  const edges = [rules.includes(0) && 'top', rules.includes(expression.rows.length) && 'bottom', lines?.[0] && 'left', lines?.[width] && 'right'].filter(Boolean);
  if (edges.length) table = `<menclose notation="${edges.join(' ')}">${table}</menclose>`;
  if (preset.small) table = `<mstyle scriptlevel="1">${table}</mstyle>`;
  return fenced(table, preset.open, preset.close);
}
/**
 * Renders font, box and modulus commands.
 * @param expression - Styled argument.
 * @param slot - Editable role projection.
 * @returns Styled markup.
 */
export function styledMarkup(expression: MathStyled, slot: MathSlotMarkup): string {
  const content = slot('content');
  const variant = mathStyleVariants[expression.name];
  switch (expression.name) {
    case 'operatorname':
    case 'operatorname*': return `<mrow><mstyle mathvariant="normal">${content}</mstyle><mo>&#x2061;</mo></mrow>`;
    case 'boxed': return `<menclose notation="box">${content}</menclose>`;
    // Transparent ink instead of `mphantom` keeps the content laid out, so its slots stay hit-testable.
    case 'phantom': return `<mstyle mathcolor="transparent">${content}</mstyle>`;
    case 'hphantom': return `<mpadded height="0" depth="0"><mstyle mathcolor="transparent">${content}</mstyle></mpadded>`;
    case 'vphantom': return `<mpadded width="0"><mstyle mathcolor="transparent">${content}</mstyle></mpadded>`;
    case 'pmod': return `<mrow><mspace width="1em"/><mo>(</mo><mi mathvariant="normal">mod</mi><mspace width="0.333em"/>${content}<mo>)</mo></mrow>`;
    case 'mod': return `<mrow><mspace width="1em"/><mi mathvariant="normal">mod</mi><mspace width="0.333em"/>${content}</mrow>`;
    default: return `<mstyle mathvariant="${variant}">${content}</mstyle>`;
  }
}
/**
 * Renders text runs and nested formulas; spaces become no-break spaces so MathML keeps them.
 * @param expression - Text command.
 * @param slot - Editable role projection for nested formulas.
 * @returns Text markup.
 */
export function textMarkup(expression: MathText, slot: MathSlotMarkup): string {
  const variant = mathTextVariants[expression.name];
  const parts = expression.parts.map((part, index) => part.kind === 'run'
    ? `<mtext mathvariant="${variant}">${escapeXml(part.value).replace(/ /gu, '&#xA0;')}</mtext>`
    : slot(`math-${index}`));
  return `<mrow>${parts.join('')}</mrow>`;
}
/**
 * Renders sized and `\middle` delimiters.
 * @param value - Delimiter glyph, empty when invisible.
 * @param size - Fixed size step or middle stretch.
 * @returns Delimiter markup.
 */
export function delimiterMarkup(value: string, size: 1 | 2 | 3 | 4 | 'middle'): string {
  if (!value) return '<mrow></mrow>';
  const glyph = escapeXml(value);
  if (size === 'middle') return `<mo stretchy="true" symmetric="true" lspace="0.05em" rspace="0.05em">${glyph}</mo>`;
  const extent = delimiterSizes[size - 1];
  return `<mo stretchy="true" symmetric="true" minsize="${extent}" maxsize="${extent}">${glyph}</mo>`;
}
