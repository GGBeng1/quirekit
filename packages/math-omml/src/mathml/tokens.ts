/**
 * Escapes MathML text.
 * @param value - Raw text.
 * @returns Escaped text.
 */
export function escapeMathML(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}

/** `m:sty`/`m:scr` combinations → MathML `mathvariant`. */
const variants: Readonly<Record<string, string>> = {
  "|p": "normal", "|b": "bold", "|bi": "bold-italic", "|i": "italic",
  "double-struck|p": "double-struck", "double-struck|": "double-struck", "script|p": "script", "script|": "script",
  "script|b": "bold-script", "fraktur|p": "fraktur", "fraktur|": "fraktur", "fraktur|b": "bold-fraktur",
  "sans-serif|p": "sans-serif", "sans-serif|": "sans-serif-italic", "sans-serif|b": "bold-sans-serif",
  "sans-serif|bi": "sans-serif-bold-italic", "monospace|p": "monospace", "monospace|": "monospace"
};

/**
 * Resolves the MathML variant of a run.
 * @param scr - `m:scr` value.
 * @param sty - `m:sty` value.
 * @returns Variant attribute text, or empty for the default.
 */
export function variantAttribute(scr: string | undefined, sty: string | undefined): string {
  if (scr === undefined && sty === undefined) return "";
  const variant = variants[`${scr ?? ""}|${sty ?? ""}`];
  return variant === undefined ? "" : ` mathvariant="${variant}"`;
}

/**
 * Splits math run text into MathML tokens: numbers, identifiers and operators.
 * @param text - Run text.
 * @param variant - Variant attribute text.
 * @returns MathML token markup.
 */
export function tokenize(text: string, variant: string): string {
  const out: string[] = [];
  const pattern = /\d+(?:\.\d+)?|\p{L}|[\s -​  ]+|./gsu;
  for (const [token] of text.matchAll(pattern)) {
    if (/^\d/u.test(token)) out.push(`<mn${variant}>${escapeMathML(token)}</mn>`);
    else if (/^\p{L}$/u.test(token)) out.push(`<mi${variant}>${escapeMathML(token)}</mi>`);
    else if (/^[\s -​  ]+$/u.test(token)) out.push(`<mspace width="${spaceWidth(token)}em"/>`);
    else out.push(`<mo>${escapeMathML(token)}</mo>`);
  }
  return out.join("");
}

/**
 * Measures a run of Unicode spaces in em.
 * @param spaces - Space characters.
 * @returns Width in em.
 */
function spaceWidth(spaces: string): number {
  const widths: Record<string, number> = { " ": 1, " ": 0.5, " ": 0.2778, " ": 0.25, " ": 0.1667, " ": 0.2222, " ": 0.1 };
  return Math.round([...spaces].reduce((sum, space) => sum + (widths[space] ?? 0.25), 0) * 10000) / 10000;
}

/** Combining accents → spacing characters MathJax stretches over their base. */
export const accentGlyphs: Readonly<Record<string, string>> = {
  "̂": "^", "ˆ": "ˆ", "̃": "~", "˜": "˜", "̅": "‾", "̄": "¯", "⃗": "→", "⃖": "←",
  "⃡": "↔", "̇": "˙", "̈": "¨", "⃛": "⋯", "̌": "ˇ", "́": "´", "̀": "`", "̆": "˘", "̊": "˚"
};
