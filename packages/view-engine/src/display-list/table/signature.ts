import type {
  QuireTableCellFragment,
  QuireTableLayoutSnapshot,
  QuireTableRowFragment
} from "../../layout";
import type { QuireTableGridTrack } from "@quirekit/layout/table";

const tablePaintSignatureSeparator = "\u001f";

/**
 * Creates a value key for table paint inputs.
 *
 * @param table - Table layout snapshot whose paint model may be cached.
 * @returns Stable cache key for table backgrounds, clips, and borders.
 */
export function createQuireTablePaintModelCacheKey(
  table: QuireTableLayoutSnapshot
): string {
  const parts: string[] = [
    "table",
    table.tableId,
    table.fragmentId,
    formatRangePart(table.tableRange),
    formatRectPart(table.rect),
    formatJsonPart(table.style),
    formatJsonPart(table.borders),
    formatOptionalNumberPart(table.cellSpacing)
  ];

  appendTrackParts(parts, table.tracks);
  appendRowParts(parts, table.rows);
  appendCellParts(parts, table.cells);

  return parts.join(tablePaintSignatureSeparator);
}

/**
 * Appends grid-track paint inputs to the signature parts.
 *
 * @param parts - Mutable signature part list.
 * @param tracks - Table tracks to include.
 * @returns Nothing.
 */
function appendTrackParts(
  parts: string[],
  tracks: readonly QuireTableGridTrack[]
): void {
  parts.push("tracks", String(tracks.length));

  for (const track of tracks) {
    parts.push(
      track.id,
      String(track.columnIndex),
      formatNumberPart(track.x),
      formatNumberPart(track.width)
    );
  }
}

/**
 * Appends row-fragment paint inputs to the signature parts.
 *
 * @param parts - Mutable signature part list.
 * @param rows - Table row fragments to include.
 * @returns Nothing.
 */
function appendRowParts(
  parts: string[],
  rows: readonly QuireTableRowFragment[]
): void {
  parts.push("rows", String(rows.length));

  for (const row of rows) {
    parts.push(
      row.id,
      row.sourceRowId,
      String(row.rowIndex),
      row.isHeader ? "header" : "body",
      row.cantSplit ? "cant-split" : "split",
      formatRangePart(row.range),
      formatRectPart(row.rect),
      formatJsonPart(row.borders),
      formatOptionalNumberPart(row.cellSpacing)
    );
  }
}

/**
 * Appends cell-fragment paint inputs to the signature parts.
 *
 * @param parts - Mutable signature part list.
 * @param cells - Table cell fragments to include.
 * @returns Nothing.
 */
function appendCellParts(
  parts: string[],
  cells: readonly QuireTableCellFragment[]
): void {
  parts.push("cells", String(cells.length));

  for (const cell of cells) {
    parts.push(
      cell.id,
      cell.semanticCellId,
      cell.originExplicitCellId,
      formatJsonPart(cell.explicitCellIds),
      String(cell.originCellPos),
      formatRangePart(cell.range),
      formatRectPart(cell.rect),
      formatRectPart(cell.contentRect),
      formatOptionalRectPart(cell.contentLayoutRect),
      formatJsonPart(cell.gridRect),
      formatJsonPart(cell.shading),
      formatJsonPart(cell.backgroundColor),
      formatJsonPart(cell.borders),
      formatJsonPart(cell.styleBorders ?? null),
      formatJsonPart(cell.cellMargins),
      formatJsonPart(cell.preferredWidth)
    );
  }
}

/**
 * Formats a document range for a paint signature.
 *
 * @param range - Document range to encode.
 * @returns Compact range signature part.
 */
function formatRangePart(range: { readonly from: number; readonly to: number }): string {
  return `${range.from},${range.to}`;
}

/**
 * Formats a rectangle for a paint signature.
 *
 * @param rect - Rectangle to encode.
 * @returns Compact rectangle signature part.
 */
function formatRectPart(rect: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): string {
  return [
    formatNumberPart(rect.x),
    formatNumberPart(rect.y),
    formatNumberPart(rect.width),
    formatNumberPart(rect.height)
  ].join(",");
}

/**
 * Formats an optional rectangle for a paint signature.
 *
 * @param rect - Optional rectangle to encode.
 * @returns Compact rectangle signature part.
 */
function formatOptionalRectPart(
  rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  } | undefined
): string {
  return rect === undefined ? "undefined" : formatRectPart(rect);
}

/**
 * Formats an optional number for a paint signature.
 *
 * @param value - Optional number to encode.
 * @returns Number signature part.
 */
function formatOptionalNumberPart(value: number | undefined): string {
  return value === undefined ? "undefined" : formatNumberPart(value);
}

/**
 * Formats a number for a paint signature.
 *
 * @param value - Number to encode.
 * @returns Number signature part.
 */
function formatNumberPart(value: number): string {
  return String(value);
}

/**
 * Formats structured source metadata for a paint signature.
 *
 * @param value - JSON-serializable value to encode.
 * @returns JSON signature part.
 */
function formatJsonPart(value: unknown): string {
  return JSON.stringify(value) ?? "undefined";
}
