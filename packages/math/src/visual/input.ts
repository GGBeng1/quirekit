import type { MathSequence } from '../model/types';
import { isMathTextScalar } from '../shared/script';

/** Typed characters that are LaTeX syntax and need an escaped or command spelling in math mode. */
const mathEscapes: Readonly<Record<string, string>> = Object.freeze({
  '{': '\\{', '}': '\\}', '%': '\\%', '#': '\\#', '&': '\\&', $: '\\$', _: '\\_', '~': '\\sim', '\\': '\\backslash',
});
/** Characters that are LaTeX syntax inside a text argument. */
const textEscapes: Readonly<Record<string, string>> = Object.freeze({
  '{': '\\{', '}': '\\}', '%': '\\%', '#': '\\#', '&': '\\&', $: '\\$', _: '\\_',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}', '\\': '\\textbackslash{}',
});

/** One run of typed input in a single mode. */
export interface MathInputRun {
  /** Math characters become symbols; text characters become a `\text{}` argument. */
  readonly mode: 'math' | 'text';
  /** Exact typed characters of the run. */
  readonly value: string;
}

/**
 * Splits typed text into math and text runs.
 * Spaces are meaningless in math mode and are kept only between text characters.
 * @param text - Keyboard, composition, symbol or pasted characters.
 * @returns Runs in input order; empty when only spaces were typed.
 */
export function splitMathInput(text: string): readonly MathInputRun[] {
  const runs: { mode: 'math' | 'text'; value: string }[] = [];
  const scalars = [...text];
  scalars.forEach((scalar, index) => {
    if (/\s/u.test(scalar)) {
      const last = runs.at(-1);
      const next = scalars.slice(index + 1).find(item => !/\s/u.test(item));
      if (last?.mode === 'text' && next && isMathTextScalar(next) && !last.value.endsWith(' ')) last.value += ' ';
      return;
    }
    const mode = isMathTextScalar(scalar) ? 'text' : 'math';
    const last = runs.at(-1);
    if (last?.mode === mode) last.value += scalar;
    else runs.push({ mode, value: scalar });
  });
  return runs;
}

/**
 * Escapes characters for a text-mode argument.
 * @param value - Literal text.
 * @returns Text-mode source.
 */
export function escapeMathText(value: string): string {
  return [...value].map(scalar => textEscapes[scalar] ?? scalar).join('');
}

/**
 * Spells typed math characters as source tokens that parse back to the same symbols.
 * @param value - Math-mode characters.
 * @param slot - Target sequence; a bracket argument cannot contain a bare `]`.
 * @returns Source tokens, or null when a character has no literal math spelling.
 */
export function mathInputTokens(value: string, slot: MathSequence): readonly string[] | null {
  const tokens: string[] = [];
  for (const scalar of value) {
    if (scalar === '^' || /[\u0000-\u001f]/u.test(scalar)) return null;
    if (scalar === ']' && slot.boundary === 'bracket') tokens.push('{]}');
    else tokens.push(mathEscapes[scalar] ?? scalar);
  }
  return tokens;
}

/**
 * Concatenates source tokens, separating a control word from a following letter.
 * @param tokens - Independent source tokens.
 * @returns Source that tokenizes into the same tokens.
 */
export function joinMathTokens(tokens: readonly string[]): string {
  return tokens.reduce((source, token) => source + (/\\[A-Za-z]+$/u.test(source) && /^[A-Za-z]/u.test(token) ? ' ' : '') + token, '');
}
