import type { MathDiagnostic } from '../model/types';
import { MathParseFailure } from './types';

/** Bounded source cursor shared by the grammar's structural families. */
export class MathLatexReader {
  /** Current UTF-16 source offset. */
  offset = 0;
  /** Active recursive depth. */
  depth = 0;
  /** Open `\left…\right` pairs; `\middle` is only valid inside one. */
  fences = 0;
  /**
   * Retains the author's exact source.
   * @param source - Complete original LaTeX.
   */
  constructor(readonly source: string) {}
  /**
   * Raises a diagnostic, unwinding the entire parse.
   * @param code - Stable failure category.
   * @param message - Unsupported or malformed construct.
   * @param offset - Original source location.
   * @returns Never returns; the diagnostic unwinds the complete parse.
   */
  fail(code: MathDiagnostic['code'], message: string, offset = this.offset): never {
    throw new MathParseFailure({ code, message, offset });
  }
  /** Skips syntax whitespace and `%` comments without changing the stored source. */
  whitespace(): void {
    while (this.offset < this.source.length) {
      const character = this.source[this.offset]!;
      if (character === '%') {
        const newline = this.source.indexOf('\n', this.offset);
        this.offset = newline < 0 ? this.source.length : newline + 1;
      } else if (/\s/u.test(character)) {
        this.offset++;
      } else {
        return;
      }
    }
  }
  /**
   * Recognizes exact separators without accepting control-word prefixes.
   * @param tokens - Admitted closing tokens.
   * @returns Whether a separator begins at the cursor.
   */
  stops(tokens: readonly string[]): boolean {
    return tokens.some(token => this.source.startsWith(token, this.offset)
      && (!/[A-Za-z]$/u.test(token) || !/[A-Za-z]/u.test(this.source[this.offset + token.length] ?? '')));
  }
  /**
   * Consumes one required literal delimiter.
   * @param token - Exact expected syntax.
   */
  expect(token: string): void {
    this.whitespace();
    if (!this.source.startsWith(token, this.offset)) this.fail('unexpected-token', `Expected ${token}.`);
    this.offset += token.length;
  }
  /**
   * Reads a complete alphabetic control word or a control symbol.
   * @returns Command name without its backslash; control symbols return their character.
   */
  command(): string {
    const start = this.offset;
    this.expect('\\');
    const name = /^[A-Za-z]+/u.exec(this.source.slice(this.offset, this.offset + 64))?.[0];
    if (name) {
      this.offset += name.length;
      return name;
    }
    const escaped = this.source[this.offset];
    if (escaped && !/[\s\\]/u.test(escaped)) {
      this.offset++;
      return escaped;
    }
    if (escaped && /[ \t]/u.test(escaped)) {
      this.offset++;
      return ' ';
    }
    return this.fail('unsupported-command', 'Unsupported escaped command.', start);
  }
  /**
   * Finds the end of the brace group opening at an offset without parsing it.
   * Used for O(n) lookahead; nested groups never trigger a second parse.
   * @param open - Offset of the opening brace.
   * @returns Offset after the matching brace, or -1 when unbalanced.
   */
  groupEnd(open: number): number {
    let depth = 0;
    for (let index = open; index < this.source.length; index++) {
      const character = this.source[index];
      if (character === '\\') index++;
      else if (character === '%') index = this.source.indexOf('\n', index) < 0 ? this.source.length : this.source.indexOf('\n', index);
      else if (character === '{') depth++;
      else if (character === '}' && --depth === 0) return index + 1;
    }
    return -1;
  }
  /**
   * Reads the next non-space character after an offset, skipping comments.
   * @param offset - Starting source position.
   * @returns Next significant character, if any.
   */
  peekAfter(offset: number): string | undefined {
    const saved = this.offset;
    this.offset = offset;
    this.whitespace();
    const character = this.source[this.offset];
    this.offset = saved;
    return character;
  }
  /** Enters a bounded recursive phase before consuming nested syntax. */
  enter(): void {
    if (++this.depth > 64) this.fail('limit-exceeded', 'Formula nesting exceeds 64 levels.');
  }
}
