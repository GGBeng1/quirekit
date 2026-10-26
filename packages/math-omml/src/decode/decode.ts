import type { OmmlElement, OmmlNode } from "../types";
import type { DecodeContext, DecodeScope } from "./context";
import { OmmlDecodeError } from "./error";
import { child, elementsOf, properties, tagOf } from "./nodes";
import { decodeAccent, decodeBar, decodeGroupCharacter, decodeLimit } from "./over-under";
import { decodeMatrix, decodeEquationArray } from "./arrays";
import { decodeDelimiter, decodeFunction, decodeNary } from "./named";
import { decodeRun } from "./text";

/** Slot decoders handed to structure modules. */
const ctx: DecodeContext = { slot: decodeSlot, group };

/**
 * Decodes the content of one slot.
 * @param node - Slot element such as `m:e`, or `m:oMath`.
 * @param scope - Decoding switches.
 * @returns LaTeX source.
 */
export function decodeSlot(node: OmmlNode | undefined, scope: DecodeScope = { alignment: false }): string {
  return node === undefined ? "" : elementsOf(node).map(item => decodeElement(item, scope)).join("");
}

/**
 * Decodes one slot as a braced group.
 * @param node - Slot element.
 * @param scope - Decoding switches.
 * @returns `{…}`.
 */
export function group(node: OmmlNode | undefined, scope?: DecodeScope): string {
  return `{${decodeSlot(node, scope)}}`;
}

/**
 * Decodes one formula element.
 * @param node - Element.
 * @param scope - Decoding switches.
 * @returns LaTeX source.
 */
function decodeElement(node: OmmlElement, scope: DecodeScope): string {
  const tag = tagOf(node)!;
  switch (tag) {
    case "m:r": return decodeRun(node, scope.alignment);
    case "m:f": return decodeFraction(node);
    case "m:rad": return decodeRadical(node);
    case "m:sSub": case "m:sSup": case "m:sSubSup": return decodeScripts(node, tag);
    case "m:nary": return decodeNary(node, ctx);
    case "m:d": return decodeDelimiter(node, ctx);
    case "m:func": return decodeFunction(node, ctx);
    case "m:limLow": case "m:limUpp": return decodeLimit(node, tag, ctx);
    case "m:acc": return decodeAccent(node, ctx);
    case "m:bar": return decodeBar(node, ctx);
    case "m:groupChr": return decodeGroupCharacter(node, ctx);
    case "m:m": return decodeMatrix(node, "matrix", ctx);
    case "m:eqArr": return decodeEquationArray(node, ctx);
    case "m:borderBox":
      properties(node, "m:borderBoxPr", [], "方框");
      return `\\boxed${group(child(node, "m:e"))}`;
    case "m:phant": return decodePhantom(node);
    case "m:sPre": throw new OmmlDecodeError("不支持左侧上下标");
    case "m:box": throw new OmmlDecodeError("不支持公式组合框");
    default: throw new OmmlDecodeError(`公式中含有不支持的“${tag}”`);
  }
}

/**
 * Decodes a fraction; a bar-less fraction is `\atop`.
 * @param node - `m:f`.
 * @returns LaTeX source.
 */
export function decodeFraction(node: OmmlElement): string {
  const type = properties(node, "m:fPr", ["m:type"], "分数").get("m:type") ?? "bar";
  const numerator = decodeSlot(child(node, "m:num")), denominator = decodeSlot(child(node, "m:den"));
  if (type === "bar") return `\\frac{${numerator}}{${denominator}}`;
  if (type === "noBar") return `{${numerator}\\atop ${denominator}}`;
  throw new OmmlDecodeError("不支持斜分数与线性分数");
}

/**
 * Decodes a radical.
 * @param node - `m:rad`.
 * @returns LaTeX source.
 */
function decodeRadical(node: OmmlElement): string {
  const hidden = properties(node, "m:radPr", ["m:degHide"], "根式").get("m:degHide") === "1";
  if (hidden) return `\\sqrt${group(child(node, "m:e"))}`;
  // A visible empty degree is the empty optional argument `\sqrt[]{…}`.
  return `\\sqrt[${decodeSlot(child(node, "m:deg"))}]${group(child(node, "m:e"))}`;
}

/**
 * Decodes postfix scripts.
 * @param node - Script element.
 * @param tag - Its tag.
 * @returns LaTeX source.
 */
function decodeScripts(node: OmmlElement, tag: string): string {
  properties(node, `${tag}Pr`, [], "上下标");
  // A single character or command needs no braces as a script base.
  const content = decodeSlot(child(node, "m:e"));
  const base = /^(?:[A-Za-z0-9]|\\[A-Za-z]+ ?)$/u.test(content) ? content : `{${content}}`;
  const sub = child(node, "m:sub"), sup = child(node, "m:sup");
  return `${base}${sub === undefined ? "" : `_${group(sub)}`}${sup === undefined ? "" : `^${group(sup)}`}`;
}

/**
 * Decodes an invisible phantom.
 * @param node - `m:phant`.
 * @returns LaTeX source.
 */
function decodePhantom(node: OmmlElement): string {
  const values = properties(node, "m:phantPr", ["m:show", "m:zeroWid", "m:zeroAsc", "m:zeroDesc"], "占位");
  const flags = ["m:zeroWid", "m:zeroAsc", "m:zeroDesc"].filter(key => values.get(key) === "1").join(",");
  if (values.get("m:show") !== "0") throw new OmmlDecodeError("不支持可见的占位");
  const command = flags === "" ? "phantom" : flags === "m:zeroAsc,m:zeroDesc" ? "hphantom" : flags === "m:zeroWid" ? "vphantom" : undefined;
  if (command === undefined) throw new OmmlDecodeError("不支持该占位尺寸组合");
  return `\\${command}${group(child(node, "m:e"))}`;
}

/**
 * Decodes one formula.
 * @param element - `m:oMath` or `m:oMathPara`.
 * @returns LaTeX source.
 */
export function decodeFormula(element: OmmlElement): string {
  if ("m:oMathPara" in element) {
    const formulas = elementsOf(element).filter(item => tagOf(item) === "m:oMath");
    const others = elementsOf(element).filter(item => !["m:oMath", "m:oMathParaPr"].includes(tagOf(item)!));
    if (formulas.length !== 1 || others.length > 0) throw new OmmlDecodeError("一个独立公式段落中含有多个公式");
    return decodeSlot(formulas[0]);
  }
  return decodeSlot(element);
}

