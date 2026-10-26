import type { MathAccentName, MathOperatorName, MathStyleName } from "@quirekit/math";
import type { OmmlRunStyle } from "../types";

/** `m:nary` characters; the integral is Word's default and stays implicit. */
export const naryCharacters: Partial<Record<MathOperatorName, string>> = {
  int: "", iint: "∬", iiint: "∭", iiiint: "⨌", oint: "∮", oiint: "∯", oiiint: "∰", sum: "∑", prod: "∏", coprod: "∐",
  bigcup: "⋃", bigcap: "⋂", bigvee: "⋁", bigwedge: "⋀", bigoplus: "⨁", bigotimes: "⨂", bigodot: "⨀", biguplus: "⨄", bigsqcup: "⨆"
};

/** Upright names of limit-like operators, written by Word as `func` names. */
export const limitOperatorNames: Partial<Record<MathOperatorName, string>> = {
  lim: "lim", limsup: "lim sup", liminf: "lim inf", max: "max", min: "min", sup: "sup", inf: "inf", det: "det", gcd: "gcd", Pr: "Pr"
};

/** `m:acc` characters written by Word's LaTeX input; `undefined` keeps Word's default accent. */
export const accentCharacters: Partial<Record<MathAccentName, string | undefined>> = {
  hat: "ˆ", widehat: undefined, tilde: "˜", widetilde: "̃", bar: "̅", vec: "⃗", dot: "̇",
  ddot: "̈", dddot: "⃛", check: "̌", acute: "́", grave: "̀", breve: "̆", mathring: "̊",
  overrightarrow: "⃗", overleftarrow: "⃖", overleftrightarrow: "⃡"
};

/** Arrows drawn under their base as group characters. */
export const underArrowCharacters: Partial<Record<MathAccentName, string>> = {
  underrightarrow: "→", underleftarrow: "←", underleftrightarrow: "↔"
};

/** Run properties applied by font commands. */
export const styleRunProperties: Partial<Record<MathStyleName, OmmlRunStyle>> = {
  mathrm: { sty: "p" }, mathbf: { sty: "b" }, mathit: { sty: "i" }, boldsymbol: { sty: "bi" },
  mathsf: { scr: "sans-serif", sty: "p" }, mathtt: { scr: "monospace", sty: "p" }, mathbb: { scr: "double-struck", sty: "p" },
  mathcal: { scr: "script", sty: "p" }, mathscr: { scr: "script", sty: "p" }, mathfrak: { scr: "fraktur", sty: "p" }
};

/** Matrix environments wrapped by a delimiter, with their begin and end characters (`(` `)` are Word's default). */
export const matrixFences: Readonly<Record<string, readonly [string, string]>> = {
  pmatrix: ["(", ")"], bmatrix: ["[", "]"], Bmatrix: ["{", "}"], vmatrix: ["|", "|"], Vmatrix: ["‖", "‖"], cases: ["{", ""]
};

/**
 * Maps a TeX space width to the Unicode space Word's LaTeX input writes.
 * @param width - Width in em.
 * @returns Space characters, or undefined for negative space.
 */
export function spaceCharacters(width: number): string | undefined {
  if (width < 0) return undefined;
  if (width >= 1) return " ".repeat(Math.round(width));
  if (Math.abs(width - 1 / 6) < 1e-6) return " ";
  if (Math.abs(width - 2 / 9) < 1e-6) return " ";
  if (Math.abs(width - 5 / 18) < 1e-6) return " ";
  return " ";
}
