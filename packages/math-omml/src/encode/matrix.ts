import type { MathColumnAlign, MathExpression, MathMatrix, MathSequence } from "@quirekit/math";
import type { EncodeContext } from "./context";
import { delimiterProperties } from "./structures";
import { matrixFences } from "./tables";
import type { OmmlElement, OmmlNode } from "../types";
import { element, properties, property } from "../xml/build";

/** Environments Word writes as equation arrays, with whether alignment points are kept. */
const equationArrays: Readonly<Record<string, boolean>> = {
  aligned: true, split: true, align: true, "align*": true, gathered: false, gather: false, "gather*": false, substack: false
};

/** Placeholder source range for synthesized alignment markers. */
const noSource = { start: 0, end: 0 };

/**
 * Encodes matrix-like environments.
 * @param matrix - Environment.
 * @param context - Encoding context.
 * @returns OMML nodes.
 */
export function encodeMatrix(matrix: MathMatrix, context: EncodeContext): OmmlNode[] {
  if (matrix.environment === "equation" || matrix.environment === "equation*") {
    return matrix.rows.flatMap(row => row.flatMap(cell => context.encodeSequence(cell, context)));
  }
  const aligned = equationArrays[matrix.environment];
  if (aligned !== undefined) {
    // Word keeps `&` as literal alignment text inside each row.
    const rows = matrix.rows.map(row => element("m:e", context.encodeChildren(joinCells(row, aligned), context)));
    return [element("m:eqArr", [properties("m:eqArrPr", aligned ? property("m:maxDist", "1") : undefined), ...rows])];
  }
  if (matrix.environment === "smallmatrix") context.losses.add("small-matrix");
  if (matrix.columnLines?.some(Boolean) === true || (matrix.rowLines?.length ?? 0) > 0) context.losses.add("array-rules");
  const table = element("m:m", [properties("m:mPr", columns(matrix)), ...rows(matrix, context)]);
  const fence = matrixFences[matrix.environment];
  return [fence === undefined ? table : element("m:d", [delimiterProperties(fence[0], fence[1]), element("m:e", [table])])];
}

/**
 * Concatenates the cells of one row.
 * @param row - Cells.
 * @param aligned - Whether to keep `&` between cells.
 * @returns Row expressions.
 */
function joinCells(row: readonly MathSequence[], aligned: boolean): MathExpression[] {
  return row.flatMap((cell, index) => [
    ...(index > 0 && aligned ? [{ kind: "symbol" as const, value: "&", source: noSource }] : []),
    ...cell.children
  ]);
}

/**
 * Builds column groups; consecutive columns with one alignment share an `m:mc`.
 * @param matrix - Environment.
 * @returns `m:mcs`.
 */
function columns(matrix: MathMatrix): OmmlElement {
  const count = Math.max(...matrix.rows.map(row => row.length));
  const aligns: MathColumnAlign[] = Array.from({ length: count }, (_, index) => matrix.columns?.[index] ?? "center");
  const groups: { align: MathColumnAlign; count: number }[] = [];
  for (const align of aligns) {
    const last = groups.at(-1);
    if (last?.align === align) last.count++; else groups.push({ align, count: 1 });
  }
  return element("m:mcs", groups.map(group => element("m:mc", [element("m:mcPr", [property("m:count", String(group.count)), property("m:mcJc", group.align)])])));
}

/**
 * Builds rows, padding short rows to the widest one as Word requires.
 * @param matrix - Environment.
 * @param context - Encoding context.
 * @returns `m:mr` elements.
 */
function rows(matrix: MathMatrix, context: EncodeContext): OmmlElement[] {
  const count = Math.max(...matrix.rows.map(row => row.length));
  return matrix.rows.map(row => element("m:mr", Array.from({ length: count }, (_, index) => element("m:e", context.encodeSequence(row[index], context)))));
}
