import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableMap, WordTableSemanticCellRef } from "../../../map";
import type { WordTableBorder, WordTableBorders } from "../../../types";
import { freshWordTableBorder } from "../../insert";
import { hasAnyBorderMetadata } from "./source";
import type { OrthogonalBorderName } from "./topology";
import type { BorderFormatCandidate, BorderFormatSource, BorderGridSegment } from "./types";

/** @param table - Repaired source table. @param map - Derived table map. @returns Indexed original authority, without subscriptions or layout reads. */
export function createBorderFormatSource(table: PMNode, map: WordTableMap): BorderFormatSource {
  const direct = new Map<string, WordTableBorders | null>();
  for (const explicit of map.explicitCells) {
    if (explicit.role === "origin" && explicit.semanticCellId) {
      direct.set(explicit.semanticCellId, table.child(explicit.rowIndex).child(explicit.cellIndex).attrs.borders ?? null);
    }
  }
  return { table, map, direct, legacy: !hasAnyBorderMetadata(table) };
}

/**
 * Reads the existing highest authority on one side of a physical unit edge.
 * Nil remains a candidate so lower-tier inheritance cannot resurrect a line.
 * @param source - Immutable source indexes.
 * @param cell - Semantic owner.
 * @param edge - Physical side of that owner.
 * @param segment - Grid-unit segment supplying the row for vertical inheritance.
 * @returns Candidate, or null when no source border exists.
 */
export function readBorderFormatCandidate(source: BorderFormatSource, cell: WordTableSemanticCellRef, edge: OrthogonalBorderName, segment: BorderGridSegment): BorderFormatCandidate | null {
  const direct = source.direct.get(cell.id)?.[edge];
  if (direct) return { cell, edge, border: direct, priority: 3 };
  const horizontal = segment.axis === "horizontal";
  const outside = segment.line === 0 || segment.line === (horizontal ? source.map.height : source.map.width);
  const rowIndex = horizontal ? (edge === "top" ? cell.rect.startRow : cell.rect.startRow + cell.rect.rowSpan - 1) : segment.offset;
  const rowBorders: WordTableBorders | null = source.table.child(rowIndex).attrs.borders;
  const rowBorder = rowBorders?.[horizontal || outside ? edge : "insideV"];
  if (rowBorder) return { cell, edge, border: rowBorder, priority: 2 };
  const tableBorders: WordTableBorders | null = source.table.attrs.borders;
  const inherited = tableBorders?.[outside ? edge : horizontal ? "insideH" : "insideV"]
    ?? (source.legacy ? freshWordTableBorder : null);
  return inherited ? { cell, edge, border: inherited, priority: outside ? 1 : 0 } : null;
}

/** @param border - Source tuple. @returns Whether the existing orthogonal edge paints under the current layout contract. */
export function isVisibleBorder(border: WordTableBorder): boolean {
  const style = border.style?.trim().toLowerCase();
  return !!style && style !== "nil" && style !== "none";
}
