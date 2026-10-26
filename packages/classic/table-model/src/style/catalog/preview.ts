import type { Schema } from "@quirekit/pm";
import { createWordTableMap } from "../../map";
import type { WordTableBorder } from "../../types";
import { resolveWordTableStyleAppearance } from "../resolve/appearance";
import { resolveWordTableEdgeBorder } from "../resolve/edges";
import type { WordTableCellEdge } from "../resolve/regions";
import type { WordTableStyleLook, WordTableStyleRegistry } from "../types";

/** One cell of a table style preview grid. */
export interface WordTableStylePreviewCell {
  /** Zero-based row. */
  readonly row: number;
  /** Zero-based column. */
  readonly column: number;
  /** RGB fill, or null for no fill. */
  readonly fill: string | null;
  /** Border drawn on each edge, or null for none. */
  readonly borders: Readonly<Record<WordTableCellEdge, WordTableBorder | null>>;
  /** Whether the style makes the cell text bold. */
  readonly bold: boolean;
}

/** Sample table rendered by the style gallery. */
export interface WordTableStylePreview {
  /** Number of rows. */
  readonly rows: number;
  /** Number of columns. */
  readonly columns: number;
  /** Cells in row-major order. */
  readonly cells: readonly WordTableStylePreviewCell[];
}

const edges: readonly WordTableCellEdge[] = ["top", "right", "bottom", "left"];

/**
 * Resolves a style over a sample grid for gallery thumbnails.
 *
 * The same appearance resolver as layout decides regions, borders, fills and
 * bold text, so a thumbnail and a table using that style never disagree.
 *
 * @param schema - Schema providing the Word table node types.
 * @param registry - Registry containing the style.
 * @param styleId - Style to preview.
 * @param look - Look switches to preview with.
 * @param rows - Sample row count.
 * @param columns - Sample column count.
 * @returns Preview grid.
 */
export function createWordTableStylePreview(
  schema: Schema,
  registry: WordTableStyleRegistry,
  styleId: string,
  look: WordTableStyleLook,
  rows = 4,
  columns = 5
): WordTableStylePreview {
  const { wordTable, wordTableRow, wordTableCell, paragraph } = schema.nodes;
  if (wordTable === undefined || wordTableRow === undefined || wordTableCell === undefined || paragraph === undefined) {
    return { rows, columns, cells: [] };
  }
  const table = wordTable.create(null, Array.from({ length: rows }, () => wordTableRow.create(
    null,
    Array.from({ length: columns }, () => wordTableCell.create(null, paragraph.create()))
  )));
  const map = createWordTableMap(table);
  const appearance = resolveWordTableStyleAppearance({ registry, map, styleId, tableLook: look });
  const cells = map.semanticCells.flatMap((cell) => {
    const styled = appearance.cells.get(cell.id);
    if (styled === undefined) return [];
    const row = cell.rect.startRow;
    const column = cell.rect.startColumn;
    const onBoundary: Readonly<Record<WordTableCellEdge, boolean>> = {
      top: row === 0,
      bottom: row === rows - 1,
      left: column === 0,
      right: column === columns - 1
    };
    return [{
      row,
      column,
      fill: styled.shading?.fill !== undefined && styled.shading.fill !== null && styled.shading.fill !== "auto"
        ? styled.shading.fill
        : null,
      borders: Object.fromEntries(edges.map(edge => [edge, resolveWordTableEdgeBorder(edge, onBoundary[edge], {
        styleCell: styled.borders,
        styleTable: appearance.table.borders ?? null
      })])) as Record<WordTableCellEdge, WordTableBorder | null>,
      bold: styled.text?.fontWeight === "bold"
    }];
  });
  return { rows, columns, cells };
}
