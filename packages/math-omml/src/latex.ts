import { parseMathLatex, type MathDiagnostic } from "@quirekit/math";
import { encodeMathOmml } from "./encode/encode";
import type { MathOmmlEncoding } from "./types";
import { serializeOmml } from "./xml/serialize";

/** Result of converting LaTeX to OMML. */
export type LatexToOmmlResult =
  | (MathOmmlEncoding & { readonly ok: true; readonly xml: string })
  | { readonly ok: false; readonly diagnostic: MathDiagnostic };

/**
 * Converts a LaTeX formula to Word OMML.
 * @param latex - Formula source in the supported LaTeX grammar.
 * @param options - `display` writes a display formula (`m:oMathPara`); default inline (`m:oMath`).
 * @returns XML, preserve-order element and losses, or the parse diagnostic.
 */
export function latexToOmml(latex: string, options: { readonly display?: boolean } = {}): LatexToOmmlResult {
  const parsed = parseMathLatex(latex);
  if (!parsed.ok) return { ok: false, diagnostic: parsed.diagnostic };
  const encoded = encodeMathOmml(parsed.document, options.display === true);
  return { ok: true, ...encoded, xml: serializeOmml(encoded.element) };
}
