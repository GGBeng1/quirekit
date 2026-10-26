/** `m:nary` characters → operator commands; a missing character is the integral. */
export const naryCommands: Readonly<Record<string, string>> = {
  "∫": "int", "∬": "iint", "∭": "iiint", "⨌": "iiiint", "∮": "oint", "∯": "oiint", "∰": "oiiint", "∑": "sum", "∏": "prod",
  "∐": "coprod", "⋃": "bigcup", "⋂": "bigcap", "⋁": "bigvee", "⋀": "bigwedge", "⨁": "bigoplus", "⨂": "bigotimes",
  "⨀": "bigodot", "⨄": "biguplus", "⨆": "bigsqcup"
};

/** Operators whose limits sit at the side by default. */
export const sideOperators = new Set(["int", "iint", "iiint", "iiiint", "oint", "oiint", "oiiint"]);

/** `m:acc` characters → accent commands; a missing character is Word's default circumflex. */
export const accentCommands: Readonly<Record<string, string>> = {
  "̂": "widehat", "ˆ": "hat", "˜": "tilde", "̃": "widetilde", "̅": "bar", "⃗": "vec",
  "̇": "dot", "̈": "ddot", "⃛": "dddot", "̌": "check", "́": "acute", "̀": "grave",
  "̆": "breve", "̊": "mathring", "⃖": "overleftarrow", "⃡": "overleftrightarrow"
};

/** Upright function names written as commands. */
export const functionNames = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
  "coth", "sech", "csch", "log", "ln", "lg", "exp", "arg", "deg", "dim", "hom", "ker"]);

/** Limit-like operator names → commands. */
export const limitOperators: Readonly<Record<string, string>> = {
  lim: "lim", "lim sup": "limsup", "lim inf": "liminf", max: "max", min: "min", sup: "sup", inf: "inf", det: "det", gcd: "gcd", Pr: "Pr"
};

/** Delimiter characters → `\left`/`\right` spellings; an empty side is `.`. */
export const delimiterSpellings: Readonly<Record<string, string>> = {
  "": ".", "(": "(", ")": ")", "[": "[", "]": "]", "{": "\\{", "}": "\\}", "|": "|", "‖": "\\|", "⟨": "\\langle ", "⟩": "\\rangle ",
  "⌊": "\\lfloor ", "⌋": "\\rfloor ", "⌈": "\\lceil ", "⌉": "\\rceil ", "/": "/"
};

/** Matrix environments wrapped by a delimiter pair, keyed by `begin|end`. */
export const fencedMatrices: Readonly<Record<string, string>> = {
  "(|)": "pmatrix", "[|]": "bmatrix", "{|}": "Bmatrix", "||": "vmatrix", "‖|‖": "Vmatrix"
};
