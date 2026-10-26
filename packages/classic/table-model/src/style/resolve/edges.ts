import type { WordTableBorder, WordTableBorderName } from "../../types";
import type { WordTableCellEdge } from "./regions";

/** Border sources for one cell edge, highest authority first below direct cell borders. */
export interface WordTableEdgeBorderSources {
  /** Direct cell borders. */
  readonly directCell?: Readonly<Partial<Record<WordTableBorderName, WordTableBorder | null>>> | null | undefined;
  /** Table-style cell borders on the cell's physical edges. */
  readonly styleCell?: Readonly<Partial<Record<WordTableBorderName, WordTableBorder | null>>> | null | undefined;
  /** Direct table borders. */
  readonly directTable?: Readonly<Partial<Record<WordTableBorderName, WordTableBorder | null>>> | null | undefined;
  /** Table-style table borders. */
  readonly styleTable?: Readonly<Partial<Record<WordTableBorderName, WordTableBorder | null>>> | null | undefined;
}

/**
 * Picks the border one cell draws on one edge, without adjacent-cell conflict
 * resolution: cell sides use the edge name, table sides use the outer edge on
 * the table boundary and `insideH`/`insideV` elsewhere.
 *
 * @param edge - Physical cell edge.
 * @param onTableBoundary - Whether the edge lies on the table boundary.
 * @param sources - Border tiers.
 * @returns Winning border, or null when no tier declares one.
 */
export function resolveWordTableEdgeBorder(
  edge: WordTableCellEdge,
  onTableBoundary: boolean,
  sources: WordTableEdgeBorderSources
): WordTableBorder | null {
  const tableSide: WordTableBorderName = onTableBoundary
    ? edge
    : edge === "top" || edge === "bottom" ? "insideH" : "insideV";
  return sources.directCell?.[edge]
    ?? sources.styleCell?.[edge]
    ?? sources.directTable?.[tableSide]
    ?? sources.styleTable?.[tableSide]
    ?? null;
}
