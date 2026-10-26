import type { MathExpression, MathFractionCommand, MathSequence } from '../model/types';
import { mathInfixFractions } from './commands';
import { MathLatexReader } from './reader';
import { parseMathCommand, parseMathScripts } from './structures';
import type { MathStructureParser } from './types';

/** Bounded recursive parser following TeX math-mode argument and script rules. */
export class MathLatexParser implements MathStructureParser {
  /** Source cursor shared by structural family parsers. */
  readonly reader: MathLatexReader;
  /**
   * Creates a parser without normalizing the author's source.
   * @param source - Exact input string.
   */
  constructor(source: string) {
    this.reader = new MathLatexReader(source);
  }
  /**
   * Parses the complete source; unknown or incomplete constructs fail atomically.
   * @returns Ordered mathematical content.
   */
  parse(): MathSequence {
    return this.sequence();
  }
  /**
   * Parses a sequence up to an unconsumed separator in its owning grammar.
   * An infix fraction (`\over`) turns the whole sequence into one fraction child.
   * @param stops - Explicit separators for the caller's current content phase.
   * @returns Complete sequence with exact content bounds.
   */
  sequence(stops: readonly string[] = []): MathSequence {
    const reader = this.reader;
    const start = reader.offset;
    reader.enter();
    let children: MathExpression[] = [];
    let infix: { readonly command: MathFractionCommand; readonly numerator: MathSequence; readonly from: number } | undefined;
    while (true) {
      reader.whitespace();
      if (reader.offset === reader.source.length || reader.stops(stops)) break;
      const command = mathInfixFractions.find(name => reader.stops([`\\${name}`]));
      if (command) {
        if (infix) reader.fail('unexpected-token', 'Ambiguous fraction; group each infix fraction separately.');
        const numerator: MathSequence = { kind: 'sequence', children, source: { start, end: reader.offset } };
        reader.command();
        infix = { command, numerator, from: reader.offset };
        children = [];
        continue;
      }
      children.push(this.scripted(this.atom()));
    }
    reader.depth--;
    if (infix) {
      const denominator: MathSequence = { kind: 'sequence', children, source: { start: infix.from, end: reader.offset } };
      children = [{ kind: 'fraction', command: infix.command, numerator: infix.numerator, denominator, source: { start, end: reader.offset } }];
    }
    return { kind: 'sequence', children, source: { start, end: reader.offset } };
  }
  /**
   * Reads one explicit group or a single-token TeX argument.
   * @param braced - Requires a group for structurally bound operands.
   * @returns Argument sequence.
   */
  argument(braced = false): MathSequence {
    const reader = this.reader;
    reader.whitespace();
    const start = reader.offset;
    if (reader.source[start] === '{') {
      reader.offset++;
      return this.group('}');
    }
    if (braced || !reader.source[start]) reader.fail('missing-argument', 'A grouped formula argument is required.');
    reader.enter();
    const atom = this.atom();
    reader.depth--;
    return { kind: 'sequence', children: [atom], source: { start, end: reader.offset } };
  }
  /**
   * Reads an optional bracket argument, as used by `\sqrt[n]` and extensible arrows.
   * @returns Bracketed sequence, or undefined when none follows.
   */
  optional(): MathSequence | undefined {
    const reader = this.reader;
    reader.whitespace();
    if (reader.source[reader.offset] !== '[') return undefined;
    reader.offset++;
    return this.group(']');
  }
  /**
   * Reads one supported atom without its postfix scripts.
   * @returns Complete expression.
   */
  atom(): MathExpression {
    const reader = this.reader;
    const start = reader.offset;
    const token = reader.source[start];
    if (token === '{') {
      reader.offset++;
      return this.group('}');
    }
    if (token === '~') {
      reader.offset++;
      return { kind: 'space', width: 1 / 3, source: { start, end: reader.offset } };
    }
    if (token === '\\') return parseMathCommand(this, reader.command(), start);
    if (!token || /[\^_}&#$]/u.test(token)) reader.fail('unexpected-token', 'Unsupported or misplaced syntax.');
    const point = reader.source.codePointAt(reader.offset)!;
    if (point < 32 || point >= 0xd800 && point <= 0xdfff) reader.fail('unexpected-token', 'Invalid Unicode scalar.');
    const value = String.fromCodePoint(point);
    reader.offset += value.length;
    return { kind: 'symbol', value, source: { start, end: reader.offset } };
  }
  /**
   * Reads a group after its opening delimiter has been consumed.
   * @param closing - Required closing token.
   * @returns Content with explicit delimiter ownership.
   */
  private group(closing: '}' | ']'): MathSequence {
    const content = this.sequence([closing]);
    this.reader.expect(closing);
    return { ...content, boundary: closing === '}' ? 'brace' : 'bracket', source: { start: content.source.start, end: this.reader.offset } };
  }
  /**
   * Attaches postfix scripts to a parsed atom.
   * @param base - Complete atom.
   * @returns The atom or a scripts node owning it.
   */
  private scripted(base: MathExpression): MathExpression {
    const reader = this.reader;
    reader.whitespace();
    const postfix = reader.source[reader.offset];
    // A brace annotation already owns its script role; TeX rejects a second one.
    if (base.kind === 'accent' && base.annotation && (base.name === 'overbrace' && postfix === '^' || base.name === 'underbrace' && postfix === '_')) {
      reader.fail('duplicate-script', 'Repeated brace annotation.');
    }
    const scripts = parseMathScripts(this);
    if (!scripts.subscript && !scripts.superscript) return base;
    return { kind: 'scripts', base, ...scripts, source: { start: base.source.start, end: reader.offset } };
  }
}
