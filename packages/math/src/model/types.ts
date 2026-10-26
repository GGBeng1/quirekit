/** A half-open range in the original LaTeX string, measured in UTF-16 units. */
export interface MathSourceRange {
  /** First source offset. */
  readonly start: number;
  /** Source offset immediately after the construct. */
  readonly end: number;
}
/** Ordered mathematical content; an empty sequence is an authoring slot. */
export interface MathSequence {
  /** Discriminant. */
  readonly kind: 'sequence';
  /** Ordered children. */
  readonly children: readonly MathExpression[];
  /** Original source range. */
  readonly source: MathSourceRange;
  /** Explicit delimiter ownership; fence, cell and dollar separators are outside this range. */
  readonly boundary?: 'brace' | 'bracket' | 'fence' | 'cell' | 'dollar';
}
/** A symbol preserves a Unicode scalar rather than a font-dependent glyph. */
export interface MathSymbol {
  /** Discriminant. */
  readonly kind: 'symbol';
  /** Unicode scalar or supported named operator. */
  readonly value: string;
  /** Original source range. */
  readonly source: MathSourceRange;
}
/** Fraction-like commands; infix forms split their enclosing group. */
export type MathFractionCommand = 'frac' | 'dfrac' | 'tfrac' | 'cfrac' | 'binom' | 'dbinom' | 'tbinom' | 'over' | 'choose' | 'atop';
/** A fraction with separately addressable numerator and denominator. */
export interface MathFraction {
  /** Discriminant. */
  readonly kind: 'fraction';
  /** Source command, which fixes display style, rule and parentheses. */
  readonly command: MathFractionCommand;
  /** Numerator slot. */
  readonly numerator: MathSequence;
  /** Denominator slot. */
  readonly denominator: MathSequence;
  /** Original source range. */
  readonly source: MathSourceRange;
}
/** A radical whose absent degree is distinct from an empty degree slot. */
export interface MathRadical {
  /** Discriminant. */
  readonly kind: 'radical';
  /** Radicand slot. */
  readonly radicand: MathSequence;
  /** Explicit degree, when present. */
  readonly degree?: MathSequence;
  /** Original source range. */
  readonly source: MathSourceRange;
}
/** Postfix scripts attach to one base without changing the author's order. */
export interface MathScripts {
  /** Discriminant. */
  readonly kind: 'scripts';
  /** Scripted expression. */
  readonly base: MathExpression;
  /** Lower script slot. */
  readonly subscript?: MathSequence;
  /** Upper script slot. */
  readonly superscript?: MathSequence;
  /** Original source range. */
  readonly source: MathSourceRange;
}
/** Supported structural expression union. */
export type MathExpression = MathSymbol | MathFraction | MathRadical | MathScripts | MathSequence | MathOperator | MathFunction | MathFence | MathAccent | MathMatrix
  | MathStyled | MathText | MathSpace | MathDelimiter | MathSwitch | MathMarker;

/** Named large operators admitted by the core grammar. */
export type MathOperatorName = 'int' | 'iint' | 'iiint' | 'iiiint' | 'oint' | 'oiint' | 'oiiint' | 'sum' | 'prod' | 'coprod'
  | 'bigcup' | 'bigcap' | 'bigvee' | 'bigwedge' | 'bigoplus' | 'bigotimes' | 'bigodot' | 'biguplus' | 'bigsqcup'
  | 'lim' | 'limsup' | 'liminf' | 'max' | 'min' | 'sup' | 'inf' | 'det' | 'gcd' | 'Pr';
/** Upright function names with explicit editable arguments. */
export type MathFunctionName = 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc' | 'arcsin' | 'arccos' | 'arctan' | 'sinh' | 'cosh' | 'tanh' | 'coth' | 'sech' | 'csch' | 'log' | 'ln' | 'lg' | 'exp'
  | 'arg' | 'deg' | 'dim' | 'hom' | 'ker';
/** An operator with independently owned limits and a grouped body. */
export interface MathOperator {
  /** Discriminant. */
  readonly kind: 'operator';
  /** Whitelisted command identity. */
  readonly name: MathOperatorName;
  /** Explicit limit geometry, including the command's default. */
  readonly placement: 'side' | 'above-below';
  /** Optional lower limit, distinct from an empty limit. */
  readonly lower?: MathSequence;
  /** Optional upper limit, distinct from an empty limit. */
  readonly upper?: MathSequence;
  /** Immediately grouped operand; absent when the operand is ordinary following content. */
  readonly body?: MathSequence;
  /** Complete original command and arguments. */
  readonly source: MathSourceRange;
}
/** A named function with optional scripts and a grouped argument. */
export interface MathFunction {
  /** Discriminant. */
  readonly kind: 'function';
  /** Fixed upright function name. */
  readonly name: MathFunctionName;
  /** Optional base or lower script. */
  readonly subscript?: MathSequence;
  /** Optional power or inverse marker. */
  readonly superscript?: MathSequence;
  /** Immediately grouped argument; absent when the argument is ordinary following content. */
  readonly argument?: MathSequence;
  /** Complete original command and arguments. */
  readonly source: MathSourceRange;
}
/** Explicit paired, stretchable delimiters with editable interior. */
export interface MathFence {
  /** Discriminant. */
  readonly kind: 'fence';
  /** Opening delimiter, empty for an invisible side. */
  readonly open: string;
  /** Closing delimiter, empty for an invisible side. */
  readonly close: string;
  /** Interior source excluding both delimiter commands. */
  readonly content: MathSequence;
  /** Complete original pair. */
  readonly source: MathSourceRange;
}
/** Accents admitted as structural commands rather than opaque glyphs. */
export type MathAccentName = 'hat' | 'widehat' | 'check' | 'grave' | 'acute' | 'tilde' | 'widetilde' | 'breve' | 'bar' | 'overline' | 'underline' | 'vec' | 'overrightarrow' | 'overleftarrow' | 'overleftrightarrow' | 'dot' | 'ddot' | 'dddot' | 'mathring' | 'overbrace' | 'underbrace' | 'overset' | 'underset' | 'stackrel'
  | 'underrightarrow' | 'underleftarrow' | 'underleftrightarrow' | 'xrightarrow' | 'xleftarrow';
/** An over/under accent with an editable base and optional annotation. */
export interface MathAccent {
  /** Discriminant. */
  readonly kind: 'accent';
  /** Whitelisted accent or annotation command. */
  readonly name: MathAccentName;
  /** Editable base. */
  readonly content: MathSequence;
  /** Brace/over-under annotation, or the optional lower label of an extensible arrow. */
  readonly annotation?: MathSequence;
  /** Complete original command and arguments. */
  readonly source: MathSourceRange;
}
/** Supported rectangular environments with fixed delimiter semantics. */
export type MathMatrixEnvironment = 'matrix' | 'pmatrix' | 'bmatrix' | 'Bmatrix' | 'vmatrix' | 'Vmatrix' | 'smallmatrix' | 'cases'
  | 'aligned' | 'gathered' | 'split' | 'array' | 'align' | 'align*' | 'gather' | 'gather*' | 'equation' | 'equation*' | 'substack';
/** Horizontal alignment of one array column. */
export type MathColumnAlign = 'left' | 'center' | 'right';
/** A bounded alignment environment with addressable cells in row order. */
export interface MathMatrix {
  /** Discriminant. */
  readonly kind: 'matrix';
  /** Environment determines brackets and cell alignment. */
  readonly environment: MathMatrixEnvironment;
  /** Nonempty rows; TeX permits rows with fewer cells than the widest row. */
  readonly rows: readonly (readonly MathSequence[])[];
  /** Explicit `array` column alignment. */
  readonly columns?: readonly MathColumnAlign[];
  /** Vertical rules after each explicit `array` column boundary, including the left edge at index 0. */
  readonly columnLines?: readonly boolean[];
  /** Row boundaries carrying `\hline`, from 0 (top) through the row count (bottom). */
  readonly rowLines?: readonly number[];
  /** Complete begin/end source. */
  readonly source: MathSourceRange;
}
/** Font and box commands whose single argument remains editable. */
export type MathStyleName = 'mathrm' | 'mathbf' | 'mathit' | 'mathsf' | 'mathtt' | 'mathbb' | 'mathcal' | 'mathfrak' | 'mathscr'
  | 'boldsymbol' | 'operatorname' | 'operatorname*' | 'boxed' | 'phantom' | 'hphantom' | 'vphantom' | 'pmod' | 'mod';
/** A styled or boxed editable argument. */
export interface MathStyled {
  /** Discriminant. */
  readonly kind: 'styled';
  /** Whitelisted command. */
  readonly name: MathStyleName;
  /** Editable argument. */
  readonly content: MathSequence;
  /** Complete command and argument. */
  readonly source: MathSourceRange;
}
/** Text-mode commands. */
export type MathTextName = 'text' | 'textrm' | 'textnormal' | 'textit' | 'textbf' | 'textsf' | 'texttt' | 'mbox';
/** Literal text between nested formulas of one text command. */
export interface MathTextRun {
  /** Discriminant. */
  readonly kind: 'run';
  /** Decoded text without grouping braces or escapes. */
  readonly value: string;
  /** Raw source of the run, including escapes and grouping braces. */
  readonly source: MathSourceRange;
}
/** A text-mode command: literal runs and `$…$` formulas, which are editable slots. */
export interface MathText {
  /** Discriminant. */
  readonly kind: 'text';
  /** Whitelisted command. */
  readonly name: MathTextName;
  /** Runs and nested formulas in source order. */
  readonly parts: readonly (MathTextRun | MathSequence)[];
  /** Complete command and argument. */
  readonly source: MathSourceRange;
}
/** Explicit horizontal space such as `\,`, `\quad` or `~`. */
export interface MathSpace {
  /** Discriminant. */
  readonly kind: 'space';
  /** Width in em; negative for `\!`. */
  readonly width: number;
  /** Original command. */
  readonly source: MathSourceRange;
}
/** A sized or `\middle` delimiter outside a `\left…\right` pair's own sides. */
export interface MathDelimiter {
  /** Discriminant. */
  readonly kind: 'delimiter';
  /** Visible glyph, or empty for an invisible delimiter. */
  readonly value: string;
  /** Fixed size step 1 to 4 (`\big` to `\Bigg`), or stretched to its fence. */
  readonly size: 1 | 2 | 3 | 4 | 'middle';
  /** Original command and delimiter. */
  readonly source: MathSourceRange;
}
/** A style switch applying to the following siblings of its sequence. */
export interface MathSwitch {
  /** Discriminant. */
  readonly kind: 'switch';
  /** TeX math style. */
  readonly style: 'display' | 'text' | 'script' | 'scriptscript';
  /** Original command. */
  readonly source: MathSourceRange;
}
/** Equation numbering and reference markers retained without mathematical content. */
export interface MathMarker {
  /** Discriminant. */
  readonly kind: 'marker';
  /** Marker command. */
  readonly command: 'tag' | 'tag*' | 'label' | 'nonumber' | 'notag';
  /** Decoded argument of `\tag` or `\label`. */
  readonly text?: string;
  /** Original command and argument. */
  readonly source: MathSourceRange;
}
/** Original author source and its versioned semantic projection. */
export interface MathDocument {
  /** Supported grammar identifier, independent of package releases. */
  readonly grammar: 'quirekit-latex-v1';
  /** Exact original source; never replaced with canonical output. */
  readonly latex: string;
  /** Complete parsed structure. */
  readonly root: MathSequence;
}
/** Fail-closed diagnostic with a position in the original string. */
export interface MathDiagnostic {
  /** Stable error classification. */
  readonly code: 'unsupported-command' | 'unexpected-token' | 'missing-argument' | 'duplicate-script' | 'limit-exceeded';
  /** UTF-16 source position. */
  readonly offset: number;
  /** Human-readable explanation. */
  readonly message: string;
}
/** Parsing never exposes a partial document on failure. */
export type MathParseResult = { readonly ok: true; readonly document: MathDocument } | { readonly ok: false; readonly diagnostic: MathDiagnostic };
