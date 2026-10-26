import { ommlFingerprint } from "./compare";
import { decodeFormula } from "./decode/decode";
import { OmmlDecodeError } from "./decode/error";
import { latexToOmml } from "./latex";
import type { OmmlElement } from "./types";

/** Result of strictly converting OMML to LaTeX. */
export type OmmlToLatexResult =
  | { readonly ok: true; readonly latex: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Converts a Word formula to LaTeX only when the result rebuilds exactly the same formula.
 * Any construct outside the supported grammar fails the whole formula; no partial source is produced.
 * @param element - `m:oMath` or `m:oMathPara`.
 * @returns LaTeX, or a user-facing reason why the formula stays as it is.
 */
export function ommlToLatex(element: OmmlElement): OmmlToLatexResult {
  let latex: string;
  try {
    latex = decodeFormula(element);
  } catch (error) {
    if (error instanceof OmmlDecodeError) return { ok: false, reason: error.message };
    throw error;
  }
  const encoded = latexToOmml(latex, { display: "m:oMathPara" in element });
  if (!encoded.ok) return { ok: false, reason: "该公式的写法无法用支持的 LaTeX 表达" };
  if (encoded.losses.length > 0 || ommlFingerprint(encoded.element) !== ommlFingerprint(element)) {
    return { ok: false, reason: "转换后的公式与原公式不完全一致" };
  }
  return { ok: true, latex };
}
