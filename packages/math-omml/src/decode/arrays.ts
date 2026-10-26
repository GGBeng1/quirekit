import type { OmmlElement } from "../types";
import type { DecodeContext } from "./context";
import { OmmlDecodeError } from "./error";
import { child, elementsOf, properties, tagOf } from "./nodes";

/** `m:mcJc` → array column letters. */
const columnLetters: Readonly<Record<string, string>> = { left: "l", center: "c", right: "r" };

/**
 * Decodes a matrix as the given environment; non-centered columns become an `array`.
 * @param node - `m:m`.
 * @param environment - Environment implied by the surrounding delimiter.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeMatrix(node: OmmlElement, environment: string, ctx: DecodeContext): string {
  if ((properties(node, "m:mPr", ["m:mcs", "m:baseJc"], "矩阵").get("m:baseJc") ?? "center") !== "center") {
    throw new OmmlDecodeError("不支持非居中的矩阵基线对齐");
  }
  const groups = elementsOf(child(child(node, "m:mPr") ?? {}, "m:mcs") ?? {});
  const aligns: string[] = [];
  for (const item of groups) {
    const values = properties(item, "m:mcPr", ["m:count", "m:mcJc"], "矩阵列");
    const letter = columnLetters[values.get("m:mcJc") ?? "center"];
    if (letter === undefined) throw new OmmlDecodeError("不支持该矩阵列对齐");
    aligns.push(...Array.from({ length: Number(values.get("m:count") ?? "1") }, () => letter));
  }
  const rows = elementsOf(node).filter(item => tagOf(item) === "m:mr")
    .map(row => elementsOf(row).map(cell => ctx.slot(cell)).join(" & ")).join(" \\\\ ");
  const centered = aligns.every(letter => letter === "c");
  if (!centered && environment !== "matrix") throw new OmmlDecodeError("不支持带括号且非居中对齐的矩阵");
  if (!centered) return `\\begin{array}{${aligns.join("")}}${rows}\\end{array}`;
  return `\\begin{${environment}}${rows}\\end{${environment}}`;
}

/**
 * Decodes an equation array: with alignment points as `aligned`, otherwise `gathered`.
 * @param node - `m:eqArr`.
 * @param ctx - Slot decoders.
 * @returns LaTeX source.
 */
export function decodeEquationArray(node: OmmlElement, ctx: DecodeContext): string {
  const aligned = properties(node, "m:eqArrPr", ["m:maxDist"], "方程组").get("m:maxDist") === "1";
  const rows = elementsOf(node).filter(item => tagOf(item) === "m:e").map(row => ctx.slot(row, { alignment: aligned }));
  if (!aligned && rows.some(row => row.includes("&"))) throw new OmmlDecodeError("不支持未对齐方程组中的对齐符号");
  const environment = aligned ? "aligned" : "gathered";
  return `\\begin{${environment}}${rows.join(" \\\\ ")}\\end{${environment}}`;
}
