import type { OmmlElement } from "../types";
import { decodeMatrix } from "./arrays";
import type { DecodeContext } from "./context";
import { OmmlDecodeError } from "./error";
import { child, elementsOf, properties, slotsOf, tagOf } from "./nodes";
import { delimiterSpellings, fencedMatrices, functionNames, limitOperators, naryCommands, sideOperators } from "./tables";

/**
 * Decodes a large operator; limits that differ from the command default become `\limits`/`\nolimits`.
 * @param node - `m:nary`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeNary(node: OmmlElement, ctx: DecodeContext): string {
  const values = properties(node, "m:naryPr", ["m:chr", "m:limLoc", "m:grow", "m:subHide", "m:supHide"], "大型运算符");
  if (values.get("m:grow") === "1") throw new OmmlDecodeError("不支持随内容伸缩的大型运算符");
  const command = naryCommands[values.get("m:chr") ?? "∫"];
  if (command === undefined) throw new OmmlDecodeError(`不支持的大型运算符“${values.get("m:chr")}”`);
  const side = sideOperators.has(command);
  const location = values.get("m:limLoc");
  const placement = location === undefined || location === (side ? "subSup" : "undOvr") ? "" : location === "subSup" ? "\\nolimits" : "\\limits";
  const lower = values.get("m:subHide") === "1" ? "" : `_${ctx.group(child(node, "m:sub"))}`;
  const upper = values.get("m:supHide") === "1" ? "" : `^${ctx.group(child(node, "m:sup"))}`;
  return `\\${command}${placement}${lower}${upper}${ctx.group(child(node, "m:e"))}`;
}

/**
 * Decodes a delimiter pair, recognizing binomials and bracketed environments.
 * @param node - `m:d`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeDelimiter(node: OmmlElement, ctx: DecodeContext): string {
  const values = properties(node, "m:dPr", ["m:begChr", "m:endChr", "m:sepChr", "m:grow", "m:shp"], "括号");
  if (values.get("m:grow") === "0") throw new OmmlDecodeError("不支持固定大小的括号");
  if ((values.get("m:shp") ?? "centered") !== "centered") throw new OmmlDecodeError("不支持与内容等高的括号形状");
  const open = values.get("m:begChr") ?? "(", close = values.get("m:endChr") ?? ")", separator = values.get("m:sepChr") ?? "|";
  const slots = slotsOf(node, "m:dPr");
  const single = slots.length === 1 ? elementsOf(slots[0]!) : [];
  const only = single.length === 1 ? single[0]! : undefined;
  if (only !== undefined && open === "(" && close === ")" && tagOf(only) === "m:f"
    && properties(only, "m:fPr", ["m:type"], "分数").get("m:type") === "noBar") {
    return `\\binom${ctx.group(child(only, "m:num"))}${ctx.group(child(only, "m:den"))}`;
  }
  if (only !== undefined && tagOf(only) === "m:m") {
    const environment = open === "{" && close === "" ? "cases" : fencedMatrices[`${open}|${close}`];
    if (environment !== undefined) return decodeMatrix(only, environment, ctx);
  }
  const left = delimiterSpellings[open], right = delimiterSpellings[close], middle = delimiterSpellings[separator];
  if (left === undefined || right === undefined || middle === undefined) throw new OmmlDecodeError("不支持该括号字符");
  return `\\left${left}${slots.map(slot => ctx.slot(slot)).join(`\\middle${middle}`)}\\right${right}`;
}

/**
 * Reads plain upright name text of a function-name run.
 * @param node - Candidate run.
 * @returns Name, or undefined when the run is not a plain upright name.
 */
function uprightName(node: OmmlElement | undefined): string | undefined {
  if (node === undefined || tagOf(node) !== "m:r") return undefined;
  const style = child(node, "m:rPr");
  const sty = style === undefined ? undefined : elementsOf(style).find(item => tagOf(item) === "m:sty");
  if ((sty?.[":@"] as Record<string, string> | undefined)?.["@_m:val"] !== "p") return undefined;
  const text = child(node, "m:t");
  return text === undefined ? undefined : elementsOf(text).length === 0
    ? (text["m:t"] as { "#text"?: unknown }[]).map(item => String(item["#text"] ?? "")).join("") : undefined;
}

/**
 * Writes a function or limit-like operator name.
 * @param name - Upright name.
 * @returns LaTeX command.
 */
function nameCommand(name: string): string {
  if (functionNames.has(name)) return `\\${name}`;
  const operator = limitOperators[name];
  return operator === undefined ? `\\operatorname{${name}}` : `\\${operator}`;
}

/**
 * Decodes a function application, including limits and scripts on its name.
 * @param node - `m:func`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeFunction(node: OmmlElement, ctx: DecodeContext): string {
  properties(node, "m:funcPr", [], "函数");
  const nameSlot = elementsOf(child(node, "m:fName") ?? {});
  if (nameSlot.length !== 1) throw new OmmlDecodeError("不支持复合函数名");
  const head = nameSlot[0]!;
  const tag = tagOf(head)!;
  let name: string | undefined, suffix = "";
  if (tag === "m:r") {
    name = uprightName(head);
  } else if (tag === "m:limLow" || tag === "m:limUpp") {
    name = uprightName(elementsOf(child(head, "m:e") ?? {})[0]);
    if (name !== undefined && limitOperators[name] === undefined) name = undefined;
    suffix = `${tag === "m:limLow" ? "_" : "^"}${ctx.group(child(head, "m:lim"))}`;
  } else if (tag === "m:sSub" || tag === "m:sSup" || tag === "m:sSubSup") {
    name = uprightName(elementsOf(child(head, "m:e") ?? {})[0]);
    const sub = child(head, "m:sub"), sup = child(head, "m:sup");
    const placement = name !== undefined && limitOperators[name] !== undefined ? "\\nolimits" : "";
    suffix = `${placement}${sub === undefined ? "" : `_${ctx.group(sub)}`}${sup === undefined ? "" : `^${ctx.group(sup)}`}`;
  }
  if (name === undefined) throw new OmmlDecodeError("不支持该函数名写法");
  return `${nameCommand(name)}${suffix}${ctx.group(child(node, "m:e"))}`;
}

