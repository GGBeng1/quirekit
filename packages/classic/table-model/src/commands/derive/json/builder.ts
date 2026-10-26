import type { QuireJSONContent } from "@quirekit/core";

/**
 * Creates an empty paragraph JSON node.
 *
 * @returns Empty paragraph JSON content.
 */
export function createEmptyParagraphJSON(): QuireJSONContent {
  return { type: "paragraph" };
}

/**
 * Creates an empty table cell JSON node.
 *
 * @param attrs - Optional attrs merged onto the cell.
 * @param content - Optional cell content.
 * @returns Word table cell JSON content.
 */
export function createWordTableCellJSON(
  attrs: Readonly<Record<string, unknown>> = {},
  content: readonly QuireJSONContent[] = [createEmptyParagraphJSON()]
): QuireJSONContent {
  return {
    type: "wordTableCell",
    attrs: {
      colspan: 1,
      gridSpan: 1,
      rowspan: 1,
      vMerge: null,
      ...attrs
    },
    content: [...content]
  };
}

/**
 * Creates an empty table row JSON node.
 *
 * @param columnCount - Number of cells to create.
 * @param rowAttrs - Optional attrs merged onto the row.
 * @param cellAttrs - Optional attrs merged onto every cell.
 * @param cellContent - Optional cell content used for every cell.
 * @param cellContents - Optional source-order content for each cell in the row.
 * @returns Word table row JSON content.
 */
export function createWordTableRowJSON(
  columnCount: number,
  rowAttrs: Readonly<Record<string, unknown>> = {},
  cellAttrs: Readonly<Record<string, unknown>> = {},
  cellContent?: readonly QuireJSONContent[],
  cellContents?: readonly (readonly QuireJSONContent[])[]
): QuireJSONContent {
  return {
    type: "wordTableRow",
    attrs: {
      gridBefore: 0,
      gridAfter: 0,
      ...rowAttrs
    },
    content: Array.from({ length: columnCount }, (_, columnIndex) =>
      createWordTableCellJSON(
        cellAttrs,
        cellContents?.[columnIndex] ?? cellContent
      )
    )
  };
}
