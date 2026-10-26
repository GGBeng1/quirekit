import { resolveQuireTableColumnLineAllowance, resolveQuireTableSideInset } from "@quirekit/layout/table";
import type { QuireTableBorder, QuireTableLength, QuireTableSource, QuireTableSourceCell } from "@quirekit/layout/table";
import { wordTableNormalStyle } from "../style/catalog/presets";
import { normalizeWordTableLength } from "./normalization";

const defaultSideMargin = normalizeWordTableLength(wordTableNormalStyle.base.table!.cellMargins!.left!)!.value!;

/**
 * Converts a legacy text-edge anchor into a neutral geometric reference expansion.
 * @param source - Normalized Word source with its resolved formatting cascade.
 * @returns Source whose placement moves all projected products together.
 */
export function applyWordTableLegacyOrigin(source: QuireTableSource): QuireTableSource {
  if (source.floating == null) return source;
  let first: QuireTableSourceCell | undefined;
  let last: QuireTableSourceCell | undefined;
  for (const cell of source.semanticCells) {
    if (cell.gridRect.startRow !== 0) continue;
    if (first === undefined || cell.gridRect.startColumn < first.gridRect.startColumn) first = cell;
    if (last === undefined || cell.gridRect.startColumn > last.gridRect.startColumn) last = cell;
  }
  if (first === undefined || last === undefined) return source;
  return { ...source, floating: { ...source.floating, horizontal: {
    ...source.floating.horizontal,
    referenceExpansion: { start: edgeExpansion(source, first, "left"), end: edgeExpansion(source, last, "right") }
  } } };
}

/**
 * Resolves a first-row outside text edge using the same authority tiers as borders.
 * @param source - Normalized table.
 * @param cell - First or last cell in the first row.
 * @param side - Physical outside edge.
 * @returns Nonnegative CSS-pixel reference expansion.
 */
function edgeExpansion(source: QuireTableSource, cell: QuireTableSourceCell, side: "left" | "right"): number {
  const margin = cell.cellMargins?.[side] ?? source.defaultCellMargins?.[side];
  const padding = margin == null ? defaultSideMargin : pixels(margin);
  // Unsupported lengths remain preserved; they cannot safely become a fixed offset.
  if (padding === undefined) return 0;
  const row = source.rows[0];
  const spacing = pixels(row?.cellSpacing ?? source.cellSpacing) ?? 0;
  const cellBorder = cell.borders?.[side] ?? cell.styleBorders?.[side];
  const inheritedBorder = row?.borders?.[side] ?? source.borders?.[side];
  if (spacing > 0) {
    return padding + spacing + borderWidth(cellBorder) + borderWidth(inheritedBorder) / 2;
  }
  // The text edge is the cell's text inset, the same one table layout uses beside a vertical line.
  const lines = resolveQuireTableColumnLineAllowance(source);
  return resolveQuireTableSideInset((side === "left" ? lines.left : lines.right).get(cell.id) ?? 0, padding);
}

/**
 * Reads a visible normalized border without reviving explicit nil or none.
 * @param border - Effective source border.
 * @returns Its nonnegative CSS width, or zero for an absent/hidden border.
 */
function borderWidth(border: QuireTableBorder | null | undefined): number {
  return border == null || border.style === "nil" || border.style === "none"
    ? 0 : Math.max(0, border.width ?? 0);
}

/**
 * Reads an absolute normalized length without guessing auto/percentage values.
 * @param length - Normalized source length.
 * @returns Nonnegative pixels, or undefined when unresolved.
 */
function pixels(length: QuireTableLength | null | undefined): number | undefined {
  if (length?.unit === "none") return 0;
  return length?.unit === "px" && length.value !== null && Number.isFinite(length.value)
    ? Math.max(0, length.value) : undefined;
}
