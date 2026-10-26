import type {
  MathAccentName,
  MathColumnAlign,
  MathFractionCommand,
  MathFunctionName,
  MathMatrixEnvironment,
  MathOperator,
  MathOperatorName,
} from '../model/types';

/** Admitted large-operator glyphs and their default limit geometry. */
export const mathOperatorCommands: Readonly<Record<MathOperatorName, readonly [string, MathOperator['placement']]>> = Object.freeze({
  int: ['∫', 'side'], iint: ['∬', 'side'], iiint: ['∭', 'side'], iiiint: ['⨌', 'side'],
  oint: ['∮', 'side'], oiint: ['∯', 'side'], oiiint: ['∰', 'side'],
  sum: ['∑', 'above-below'], prod: ['∏', 'above-below'], coprod: ['∐', 'above-below'],
  bigcup: ['⋃', 'above-below'], bigcap: ['⋂', 'above-below'],
  bigvee: ['⋁', 'above-below'], bigwedge: ['⋀', 'above-below'],
  bigoplus: ['⨁', 'above-below'], bigotimes: ['⨂', 'above-below'], bigodot: ['⨀', 'above-below'],
  biguplus: ['⨄', 'above-below'], bigsqcup: ['⨆', 'above-below'],
  lim: ['lim', 'above-below'], limsup: ['lim sup', 'above-below'], liminf: ['lim inf', 'above-below'],
  max: ['max', 'above-below'], min: ['min', 'above-below'], sup: ['sup', 'above-below'], inf: ['inf', 'above-below'],
  det: ['det', 'above-below'], gcd: ['gcd', 'above-below'], Pr: ['Pr', 'above-below'],
});
/** Functions always use upright names; their argument may be grouped or ordinary following content. */
export const mathFunctionCommands: readonly MathFunctionName[] = Object.freeze([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch', 'log', 'ln', 'lg', 'exp',
  'arg', 'deg', 'dim', 'hom', 'ker',
]);
/** Accent glyph, under-position and stretch behavior form one admitted preset. */
export const mathAccentCommands: Readonly<Record<MathAccentName, readonly [string, boolean, boolean]>> = Object.freeze({
  hat: ['^', false, false], widehat: ['^', false, true], check: ['ˇ', false, false],
  grave: ['`', false, false], acute: ['´', false, false], tilde: ['~', false, false],
  widetilde: ['~', false, true], breve: ['˘', false, false], bar: ['¯', false, false],
  overline: ['¯', false, true], underline: ['_', true, true], vec: ['→', false, false],
  overrightarrow: ['→', false, true], overleftarrow: ['←', false, true],
  overleftrightarrow: ['↔', false, true], dot: ['˙', false, false], ddot: ['¨', false, false],
  dddot: ['⃛', false, false], mathring: ['˚', false, false],
  overbrace: ['⏞', false, true], underbrace: ['⏟', true, true],
  overset: ['', false, false], underset: ['', true, false], stackrel: ['', false, false],
  underrightarrow: ['→', true, true], underleftarrow: ['←', true, true], underleftrightarrow: ['↔', true, true],
  xrightarrow: ['→', false, true], xleftarrow: ['←', false, true],
});
/** Accents whose first argument is the annotation and second the base. */
export const mathAnnotationFirstAccents: ReadonlySet<MathAccentName> = new Set(['overset', 'underset', 'stackrel']);
/** Extensible arrows: the required argument sits above, an optional bracket argument below. */
export const mathExtensibleArrows: ReadonlySet<MathAccentName> = new Set(['xrightarrow', 'xleftarrow']);

/** Fraction display style, rule and enclosing parentheses for each fraction-like command. */
export const mathFractionCommands: Readonly<Record<MathFractionCommand, { readonly style?: 'display' | 'text'; readonly rule: boolean; readonly parentheses: boolean }>> = Object.freeze({
  frac: { rule: true, parentheses: false }, dfrac: { style: 'display', rule: true, parentheses: false },
  tfrac: { style: 'text', rule: true, parentheses: false }, cfrac: { style: 'display', rule: true, parentheses: false },
  binom: { rule: false, parentheses: true }, dbinom: { style: 'display', rule: false, parentheses: true },
  tbinom: { style: 'text', rule: false, parentheses: true },
  over: { rule: true, parentheses: false }, choose: { rule: false, parentheses: true }, atop: { rule: false, parentheses: false },
});
/** Infix fraction commands split their enclosing group. */
export const mathInfixFractions: readonly MathFractionCommand[] = Object.freeze(['over', 'choose', 'atop']);

/** Fixed rendering and admission facts for one alignment environment. */
export interface MathEnvironmentPreset {
  /** Opening delimiter, empty when absent. */
  readonly open: string;
  /** Closing delimiter, empty when absent. */
  readonly close: string;
  /** Column alignment, repeated as pairs for `aligned`-like environments. */
  readonly align: readonly MathColumnAlign[];
  /** Horizontal spacing between repeated column pairs. */
  readonly spacing?: string;
  /** Script-size cells. */
  readonly small?: boolean;
  /** Maximum columns that TeX admits for this environment. */
  readonly maxColumns?: number;
  /** Maximum rows that TeX admits for this environment. */
  readonly maxRows?: number;
}
const matrix: MathEnvironmentPreset = { open: '', close: '', align: ['center'] };
const aligned: MathEnvironmentPreset = { open: '', close: '', align: ['right', 'left'], spacing: '0em 2em' };
const gathered: MathEnvironmentPreset = { open: '', close: '', align: ['center'], maxColumns: 1 };
/** Environment admission also fixes delimiters and alignment. */
export const mathEnvironments: Readonly<Record<MathMatrixEnvironment, MathEnvironmentPreset>> = Object.freeze({
  matrix, pmatrix: { ...matrix, open: '(', close: ')' }, bmatrix: { ...matrix, open: '[', close: ']' },
  Bmatrix: { ...matrix, open: '{', close: '}' }, vmatrix: { ...matrix, open: '|', close: '|' },
  Vmatrix: { ...matrix, open: '‖', close: '‖' }, smallmatrix: { ...matrix, small: true },
  cases: { open: '{', close: '', align: ['left', 'left'], maxColumns: 2 },
  aligned, split: { ...aligned, maxColumns: 2 }, align: aligned, 'align*': aligned,
  gathered, gather: gathered, 'gather*': gathered,
  equation: { ...gathered, maxRows: 1 }, 'equation*': { ...gathered, maxRows: 1 },
  array: matrix, substack: { ...gathered, small: true },
});
/** Row and column bounds for parsed environments; authoring templates stay within eight. */
export const mathEnvironmentLimits = Object.freeze({ rows: 100, columns: 32 });
