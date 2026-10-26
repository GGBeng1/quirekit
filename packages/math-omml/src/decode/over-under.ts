import type { OmmlElement } from "../types";
import type { DecodeContext } from "./context";
import { OmmlDecodeError } from "./error";
import { child, elementsOf, properties, tagOf } from "./nodes";
import { accentCommands } from "./tables";

/** Arrows drawn under their base. */
const underArrows: Readonly<Record<string, string>> = { "→": "underrightarrow", "←": "underleftarrow", "↔": "underleftrightarrow" };

/**
 * Reads group-character properties.
 * @param node - `m:groupChr`.
 * @returns Character, position and vertical justification with Word's defaults.
 */
function groupProperties(node: OmmlElement): { readonly chr: string; readonly pos: string; readonly vertJc: string } {
  const values = properties(node, "m:groupChrPr", ["m:chr", "m:pos", "m:vertJc"], "分组符号");
  return { chr: values.get("m:chr") ?? "⏟", pos: values.get("m:pos") ?? "bot", vertJc: values.get("m:vertJc") ?? "top" };
}

/**
 * Reads the base of an extensible arrow: a group character whose base is a box.
 * @param node - `m:groupChr`.
 * @returns Arrow command and boxed base, or undefined.
 */
function extensibleArrow(node: OmmlElement): { readonly command: string; readonly base: OmmlElement | undefined } | undefined {
  const { chr, pos, vertJc } = groupProperties(node);
  const content = elementsOf(child(node, "m:e") ?? {});
  if (pos !== "bot" || vertJc !== "bot" || content.length !== 1 || tagOf(content[0]!) !== "m:box") return undefined;
  const command = chr === "→" ? "xrightarrow" : chr === "←" ? "xleftarrow" : undefined;
  if (command === undefined) return undefined;
  properties(content[0]!, "m:boxPr", [], "公式组合框");
  return { command, base: child(content[0]!, "m:e") };
}

/**
 * Decodes a group character without annotation.
 * @param node - `m:groupChr`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeGroupCharacter(node: OmmlElement, ctx: DecodeContext): string {
  const arrow = extensibleArrow(node);
  if (arrow !== undefined) return `\\${arrow.command}${ctx.group(arrow.base)}`;
  const { chr, pos, vertJc } = groupProperties(node);
  const base = ctx.group(child(node, "m:e"));
  if (chr === "⏞" && pos === "top" && vertJc === "bot") return `\\overbrace${base}`;
  if (chr === "⏟" && pos === "bot" && vertJc === "top") return `\\underbrace${base}`;
  const under = underArrows[chr];
  if (under !== undefined && pos === "bot" && vertJc === "top") return `\\${under}${base}`;
  throw new OmmlDecodeError("不支持该分组符号");
}

/**
 * Decodes over/under limits, recognizing annotated braces and labelled arrows.
 * @param node - `m:limLow` or `m:limUpp`.
 * @param tag - Its tag.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeLimit(node: OmmlElement, tag: string, ctx: DecodeContext): string {
  properties(node, `${tag}Pr`, [], "上下限");
  const lower = tag === "m:limLow";
  const base = elementsOf(child(node, "m:e") ?? {});
  const limit = ctx.group(child(node, "m:lim"));
  const inner = base.length === 1 && tagOf(base[0]!) === "m:groupChr" ? base[0]! : undefined;
  if (inner !== undefined) {
    const arrow = lower ? extensibleArrow(inner) : undefined;
    if (arrow !== undefined) return `\\${arrow.command}[${limit.slice(1, -1)}]${ctx.group(arrow.base)}`;
    const { chr, pos, vertJc } = groupProperties(inner);
    if (!lower && chr === "⏞" && pos === "top" && vertJc === "bot") return `\\overbrace${ctx.group(child(inner, "m:e"))}^${limit}`;
    if (lower && chr === "⏟" && pos === "bot" && vertJc === "top") return `\\underbrace${ctx.group(child(inner, "m:e"))}_${limit}`;
  }
  return `\\${lower ? "underset" : "overset"}${limit}${ctx.group(child(node, "m:e"))}`;
}

/**
 * Decodes an accent.
 * @param node - `m:acc`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeAccent(node: OmmlElement, ctx: DecodeContext): string {
  const character = properties(node, "m:accPr", ["m:chr"], "重音").get("m:chr") ?? "̂";
  const command = accentCommands[character];
  if (command === undefined) throw new OmmlDecodeError(`不支持的重音符号“${character}”`);
  return `\\${command}${ctx.group(child(node, "m:e"))}`;
}

/**
 * Decodes an over- or underline.
 * @param node - `m:bar`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeBar(node: OmmlElement, ctx: DecodeContext): string {
  const position = properties(node, "m:barPr", ["m:pos"], "横线").get("m:pos") ?? "bot";
  return `\\${position === "top" ? "overline" : "underline"}${ctx.group(child(node, "m:e"))}`;
}
