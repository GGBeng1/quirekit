import { mathSymbolCommands, parseMathLatex } from "@quirekit/math";
import type { OmmlElement } from "../types";
import { OmmlDecodeError } from "./error";
import { childrenOf, elementsOf, tagOf } from "./nodes";

/** Characters written as escapes in math mode. */
const escapes: Readonly<Record<string, string>> = {
  "{": "\\{", "}": "\\}", "#": "\\#", "$": "\\$", "%": "\\%", "&": "\\&", "_": "\\_", "\\": "\\backslash ",
  " ": "\\ ", "\u2009": "\\,", "\u205F": "\\:", "\u2004": "\;", "\u2003": "\\quad ", "\u00A0": "~", "′": "'"
};

/** Unicode symbol → command, preferring the first spelling declared by the grammar. */
const symbolCommands = new Map<string, string>();
for (const [command, value] of Object.entries(mathSymbolCommands)) if (!symbolCommands.has(value)) symbolCommands.set(value, command);

/** Characters the grammar accepts literally, memoized per character. */
const literal = new Map<string, boolean>();

/**
 * Writes one math-mode character.
 * @param character - Unicode scalar.
 * @param alignment - Whether `&` is an equation-array alignment point.
 * @returns LaTeX source.
 */
export function mathCharacter(character: string, alignment = false): string {
  if (alignment && character === "&") return "&";
  // Word draws a hyphen-minus in a math run as a minus sign; WPS writes the sign itself.
  if (character === "\u2212") return "-";
  const escaped = escapes[character];
  if (escaped !== undefined) return escaped;
  if (/^[A-Za-z0-9+\-=<>()[\],.;:!?/|*']$/u.test(character)) return character;
  const command = symbolCommands.get(character);
  if (command !== undefined) return `\\${command} `;
  let accepted = literal.get(character);
  if (accepted === undefined) {
    const parsed = parseMathLatex(character);
    accepted = parsed.ok && parsed.document.root.children.length === 1
      && parsed.document.root.children[0]!.kind === "symbol" && (parsed.document.root.children[0] as { value: string }).value === character;
    literal.set(character, accepted);
  }
  if (!accepted) throw new OmmlDecodeError(`不支持的公式字符“${character}”`);
  return character;
}

/**
 * Writes text-mode content of a normal-text run.
 * @param text - Run text.
 * @returns Escaped text-mode source.
 */
function textModeCharacters(text: string): string {
  return [...text].map(character => character === "\u00A0" ? " "
    : ({ "{": "\\{", "}": "\\}", "#": "\\#", "$": "\\$", "%": "\\%", "&": "\\&", "_": "\\_" } as Record<string, string>)[character] ?? character).join("");
}

/** Word run properties that only restate routine math formatting. */
const routineWordProperties = new Set(["w:rFonts", "w:i", "w:iCs", "w:lang", "w:noProof"]);

/** Font commands keyed by `scr|sty`. */
const fontCommands: Readonly<Record<string, string>> = {
  "|p": "mathrm", "|b": "mathbf", "|bi": "boldsymbol", "|i": "mathit",
  "double-struck|p": "mathbb", "script|p": "mathcal", "fraktur|p": "mathfrak", "sans-serif|p": "mathsf", "monospace|p": "mathtt"
};

/**
 * Decodes one math run.
 * @param run - `m:r` element.
 * @param alignment - Whether the run is inside an equation array row.
 * @returns LaTeX source.
 */
export function decodeRun(run: OmmlElement, alignment: boolean): string {
  let text = "";
  let sty: string | undefined, scr: string | undefined, normal = false;
  for (const part of elementsOf(run)) {
    const tag = tagOf(part);
    if (tag === "m:t") text += childrenOf(part).map(item => String((item as { "#text"?: unknown })["#text"] ?? "")).join("");
    else if (tag === "w:rPr") {
      const custom = elementsOf(part).find(item => !routineWordProperties.has(tagOf(item)!));
      if (custom !== undefined) throw new OmmlDecodeError("公式文字带有 Word 字符格式（如颜色、字号或加粗）");
    } else if (tag === "m:rPr") {
      for (const property of elementsOf(part)) {
        const name = tagOf(property);
        const value = (property[":@"] as Record<string, string> | undefined)?.["@_m:val"];
        if (name === "m:sty") sty = value;
        else if (name === "m:scr") scr = value;
        else if (name === "m:nor") normal = value === undefined || value === "1" || value === "on" || value === "true";
        else throw new OmmlDecodeError(`不支持公式文字的“${String(name).replace(/^m:/u, "")}”设置`);
      }
    } else if (tag === "w:ins" || tag === "w:del") {
      throw new OmmlDecodeError("公式内含有修订");
    } else if (tag === "w:t") {
      text += childrenOf(part).map(item => String((item as { "#text"?: unknown })["#text"] ?? "")).join("");
    } else throw new OmmlDecodeError(`公式文字中含有不支持的“${tag}”`);
  }
  if (text === "") return "";
  if (normal) {
    const command = sty === "b" ? "textbf" : sty === "i" ? "textit" : scr === undefined && (sty === undefined || sty === "p") ? "text" : undefined;
    if (command === undefined) throw new OmmlDecodeError("不支持带字体样式的普通文字");
    return `\\${command}{${textModeCharacters(text)}}`;
  }
  const body = [...text].map(character => mathCharacter(character, alignment)).join("");
  if (sty === undefined && scr === undefined) return body;
  const font = fontCommands[`${scr ?? ""}|${sty ?? ""}`];
  if (font === undefined) throw new OmmlDecodeError("不支持该公式字体组合");
  return `\\${font}{${body}}`;
}
