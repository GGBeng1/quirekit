import type { MathParseResult } from '../model/types';
import { MathLatexParser } from './parser';
import { MathParseFailure } from './types';

/**
 * Parses the whole admitted LaTeX subset without partial success or source rewriting.
 * @param latex - Exact author input.
 * @returns Complete document or a source diagnostic.
 */
export function parseMathLatex(latex: string): MathParseResult {
  if (latex.length > 16384) return { ok: false, diagnostic: { code: 'limit-exceeded', offset: 16384, message: 'Formula source exceeds 16384 UTF-16 units.' } };
  try {
    return { ok: true, document: { grammar: 'quirekit-latex-v1', latex, root: new MathLatexParser(latex).parse() } };
  } catch (error) {
    if (!(error instanceof MathParseFailure)) throw error;
    return { ok: false, diagnostic: error.diagnostic };
  }
}
