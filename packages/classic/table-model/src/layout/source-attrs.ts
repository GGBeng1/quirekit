import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableAlignment, WordTableBorder, WordTableBorderName, WordTableBorders, WordTableCellMargins, WordTableGridColumn, WordTableLayout, WordTableRowHeight, WordTableShading, WordTableVerticalAlignment, WordTableWidth } from "../types";

const tableBorderResolutionOrder: readonly WordTableBorderName[] = [
  "top",
  "right",
  "bottom",
  "left",
  "insideH",
  "insideV"
];

/** C1 table border style resolved from Word table border attrs. */
export interface QuireTableSourceBorderStyle {
  /** Concrete border color, or null when the source uses automatic color. */
  readonly color: string | null;
  /** Concrete border width in CSS pixels, or null when unspecified. */
  readonly width: number | null;
}

/**
 * Reads declared table grid metadata from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Declared grid columns, or an empty array.
 */
export function readQuireTableSourceGrid(
  tableNode: PMNode
): readonly WordTableGridColumn[] {
  const grid: unknown = tableNode.attrs.grid;
  if (Array.isArray(grid) && grid.length > 0) {
    return grid as readonly WordTableGridColumn[];
  }

  return readLegacyGridColumns(tableNode.attrs.legacyColumns);
}

/**
 * Reads the preferred table width from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Preferred Word table width, or null.
 */
export function readQuireTableSourceTableWidth(
  tableNode: PMNode
): WordTableWidth | null {
  return readWordTableWidth(tableNode.attrs.width);
}

/**
 * Reads the declared grid sizing authority from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Declared Word table layout mode, or null.
 */
export function readQuireTableSourceTableLayout(
  tableNode: PMNode
): WordTableLayout | null {
  const tableLayout: unknown = tableNode.attrs.tableLayout;
  return tableLayout === "autofit" || tableLayout === "fixed"
    ? tableLayout
    : null;
}

/**
 * Reads table-level horizontal alignment from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Word-compatible alignment, or null.
 */
export function readQuireTableSourceTableAlignment(
  tableNode: PMNode
): WordTableAlignment | null {
  const alignment: unknown = tableNode.attrs.alignment;

  return alignment === "left" ||
    alignment === "center" ||
    alignment === "right"
    ? alignment
    : null;
}

/**
 * Reads table-level indent metadata from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Word-compatible table indent, or null.
 */
export function readQuireTableSourceTableIndent(
  tableNode: PMNode
): WordTableWidth | null {
  return readWordTableWidth(tableNode.attrs.tableIndent);
}

/**
 * Reads table-level shading from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Word table shading, or null.
 */
export function readQuireTableSourceTableShading(
  tableNode: PMNode
): WordTableShading | null {
  return readShading(tableNode.attrs.shading);
}

/**
 * Reads table-level borders from a table node.
 *
 * @param tableNode - Source Word table node.
 * @returns Sanitized Word table borders, or null.
 */
export function readQuireTableSourceTableBorders(
  tableNode: PMNode
): WordTableBorders | null {
  return readWordTableBorders(tableNode.attrs.borders);
}

/**
 * Reads style-derived table borders without conflating them with direct attrs.
 *
 * @param tableNode - Source Word table node.
 * @returns Sanitized style-derived borders, or null.
 */
export function readQuireTableSourceStyleBorders(
  tableNode: PMNode
): WordTableBorders | null {
  const properties = readUnknownRecord(tableNode.attrs.styleProperties);
  return readWordTableBorders(properties?.borders);
}

/**
 * Reads style-derived cell margins without conflating them with direct attrs.
 *
 * @param tableNode - Source Word table node.
 * @returns Sanitized style-derived margins, or null.
 */
export function readQuireTableSourceStyleCellMargins(
  tableNode: PMNode
): WordTableCellMargins | null {
  const properties = readUnknownRecord(tableNode.attrs.styleProperties);
  return readQuireTableSourceCellMargins(properties?.defaultCellMargins);
}

/**
 * Reads row-level borders from a table row node.
 *
 * @param rowNode - Source Word table row node, if available.
 * @returns Sanitized Word table borders, or null.
 */
export function readQuireTableSourceRowBorders(
  rowNode: PMNode | null | undefined
): WordTableBorders | null {
  return rowNode === null || rowNode === undefined
    ? null
    : readWordTableBorders(rowNode.attrs.borders);
}

/**
 * Resolves table-level Word borders into the C1 uniform border style.
 *
 * This is intentionally a lossy C1 projection. Full per-edge border graph and
 * conflict resolution stay in the dedicated border milestone.
 *
 * @param tableNode - Source Word table node.
 * @returns C1 border style, or null when no concrete border is declared.
 */
export function readQuireTableSourceTableBorderStyle(
  tableNode: PMNode
): QuireTableSourceBorderStyle | null {
  const border = findFirstConcreteBorder(readWordTableBorders(
    tableNode.attrs.borders
  ));

  if (!border) {
    return null;
  }

  const color = resolveQuireTableSourceColor(border.color);
  const width = resolveQuireTableSourceBorderWidth(border);

  return color === null && width === null ? null : { color, width };
}

/**
 * Reads cell-level shading from a cell node.
 *
 * @param cellNode - Source Word table cell node.
 * @returns Word table shading, or null.
 */
export function readQuireTableSourceCellShading(
  cellNode: PMNode
): WordTableShading | null {
  return readShading(cellNode.attrs.shading);
}

/**
 * Reads the cell background-color shortcut from a table cell node.
 *
 * @param cellNode - Source Word table cell node.
 * @returns CSS-like background color, or null when absent or automatic.
 */
export function readQuireTableSourceCellBackgroundColor(
  cellNode: PMNode
): string | null {
  const backgroundColor: unknown = cellNode.attrs.backgroundColor;

  return typeof backgroundColor === "string"
    ? resolveQuireTableSourceColor(backgroundColor)
    : null;
}

/**
 * Reads the preferred cell width from a table cell node.
 *
 * @param cellNode - Source Word table cell node.
 * @returns Preferred Word-compatible cell width, or null.
 */
export function readQuireTableSourceCellWidth(
  cellNode: PMNode
): WordTableWidth | null {
  return readWordTableWidth(cellNode.attrs.width);
}

/**
 * Reads cell-level borders from a table cell node.
 *
 * @param cellNode - Source Word table cell node.
 * @returns Sanitized Word table borders, or null.
 */
export function readQuireTableSourceCellBorders(
  cellNode: PMNode
): WordTableBorders | null {
  return readWordTableBorders(cellNode.attrs.borders);
}

/**
 * Reads cell-level no-wrap metadata from a table cell node.
 *
 * @param cellNode - Source Word table cell node.
 * @returns Word-compatible no-wrap flag, or null when unspecified.
 */
export function readQuireTableSourceCellNoWrap(
  cellNode: PMNode
): boolean | null {
  const noWrap: unknown = cellNode.attrs.noWrap;

  return typeof noWrap === "boolean" ? noWrap : null;
}

/**
 * Reads cell-level vertical alignment from a table cell node.
 *
 * @param cellNode - Source Word table cell node.
 * @returns Word-compatible cell vertical alignment, or null.
 */
export function readQuireTableSourceCellVerticalAlign(
  cellNode: PMNode
): WordTableVerticalAlignment | null {
  const verticalAlign: unknown = cellNode.attrs.verticalAlign;

  return verticalAlign === "top" ||
    verticalAlign === "center" ||
    verticalAlign === "bottom"
    ? verticalAlign
    : null;
}

/**
 * Reads a Word table row height value from an unknown attrs payload.
 *
 * @param height - Unknown row height value.
 * @returns Word table row height, or null.
 */
export function readQuireTableSourceRowHeight(
  height: unknown
): WordTableRowHeight | null {
  if (!height || typeof height !== "object") {
    return null;
  }

  const candidate = height as Partial<WordTableRowHeight>;

  if (typeof candidate.value !== "number" || !Number.isFinite(candidate.value)) {
    return null;
  }

  return candidate.rule === "auto" ||
    candidate.rule === "atLeast" ||
    candidate.rule === "exact"
    ? {
        value: candidate.value,
        rule: candidate.rule
      }
    : null;
}

/**
 * Reads Word table cell margins from an unknown attrs payload.
 *
 * @param margins - Unknown margin value.
 * @returns Word table cell margins, or null.
 */
export function readQuireTableSourceCellMargins(
  margins: unknown
): WordTableCellMargins | null {
  if (!margins || typeof margins !== "object") {
    return null;
  }

  const candidate = margins as Readonly<Record<string, unknown>>;
  return {
    top: readWordTableWidth(candidate.top),
    right: readWordTableWidth(candidate.right),
    bottom: readWordTableWidth(candidate.bottom),
    left: readWordTableWidth(candidate.left)
  };
}

/**
 * Reads Word table cell-spacing metadata from an unknown attrs payload.
 *
 * @param cellSpacing - Unknown table or row cell-spacing value.
 * @returns Word-compatible spacing length, or null.
 */
export function readQuireTableSourceCellSpacing(
  cellSpacing: unknown
): WordTableWidth | null {
  return readWordTableWidth(cellSpacing);
}

/**
 * Resolves a Word border width into CSS pixels.
 *
 * Word border sizes are stored in eighths of a point; CSS pixels are 96 DPI.
 * The conversion is `(size / 8) * (96 / 72)`, which simplifies to `size / 6`.
 *
 * @param border - Source Word border.
 * @returns Border width in CSS pixels, or null when unresolved.
 */
function resolveQuireTableSourceBorderWidth(
  border: WordTableBorder
): number | null {
  return typeof border.size === "number" &&
    Number.isFinite(border.size) &&
    border.size > 0
    ? border.size / 6
    : null;
}

/**
 * Finds the first concrete border in the C1 resolution order.
 *
 * @param borders - Source Word table border map.
 * @returns First concrete border, or null.
 */
function findFirstConcreteBorder(
  borders: WordTableBorders | null
): WordTableBorder | null {
  if (!borders) {
    return null;
  }

  for (const name of tableBorderResolutionOrder) {
    const border = borders[name] ?? null;

    if (isConcreteWordBorder(border)) {
      return border;
    }
  }

  return null;
}

/**
 * Checks whether a Word border should produce a C1 solid border.
 *
 * @param border - Source Word border candidate.
 * @returns True when the border represents a visible edge in C1.
 */
function isConcreteWordBorder(
  border: WordTableBorder | null
): border is WordTableBorder {
  if (!border) {
    return false;
  }

  const style = border.style.trim().toLowerCase();
  return style !== "" && style !== "nil" && style !== "none";
}

/**
 * Reads Word table borders from an unknown attrs payload.
 *
 * @param borders - Unknown border map value.
 * @returns Sanitized Word border map, or null.
 */
function readWordTableBorders(borders: unknown): WordTableBorders | null {
  if (!borders || typeof borders !== "object") {
    return null;
  }

  const candidate = borders as Partial<Record<WordTableBorderName, unknown>>;
  let result: WordTableBorders = {
    top: readWordTableBorder(candidate.top),
    right: readWordTableBorder(candidate.right),
    bottom: readWordTableBorder(candidate.bottom),
    left: readWordTableBorder(candidate.left),
    insideH: readWordTableBorder(candidate.insideH),
    insideV: readWordTableBorder(candidate.insideV)
  };

  if (hasOwnProperty(candidate, "tl2br")) {
    result = {
      ...result,
      tl2br: readWordTableBorder(candidate.tl2br)
    };
  }

  if (hasOwnProperty(candidate, "tr2bl")) {
    result = {
      ...result,
      tr2bl: readWordTableBorder(candidate.tr2bl)
    };
  }

  return result;
}

/**
 * Checks whether a sanitized unknown object explicitly carries a property.
 *
 * @param value - Object-like value to inspect.
 * @param property - Property key to check.
 * @returns True when the property is present directly on the object.
 */
function hasOwnProperty(
  value: object,
  property: WordTableBorderName
): boolean {
  return Object.prototype.hasOwnProperty.call(value, property);
}

/**
 * Reads one Word table border from an unknown attrs payload.
 *
 * @param border - Unknown border value.
 * @returns Sanitized Word border, or null.
 */
function readWordTableBorder(border: unknown): WordTableBorder | null {
  if (!border || typeof border !== "object") {
    return null;
  }

  const candidate = border as Partial<WordTableBorder>;

  if (typeof candidate.style !== "string") {
    return null;
  }

  return {
    style: candidate.style,
    size: typeof candidate.size === "number" &&
      Number.isFinite(candidate.size)
      ? candidate.size
      : null,
    color: typeof candidate.color === "string" ? candidate.color : null,
    space: typeof candidate.space === "number" &&
      Number.isFinite(candidate.space)
      ? candidate.space
      : null
  };
}

/**
 * Reads a Word table width value from an unknown attrs payload.
 *
 * @param width - Unknown width value.
 * @returns Word table width, or null.
 */
function readWordTableWidth(width: unknown): WordTableWidth | null {
  if (!width || typeof width !== "object") {
    return null;
  }

  const candidate = width as Partial<WordTableWidth>;

  if (
    candidate.unit !== "auto" &&
    candidate.unit !== "dxa" &&
    candidate.unit !== "pct" &&
    candidate.unit !== "nil" &&
    candidate.unit !== "px"
  ) {
    return null;
  }

  return {
    value: typeof candidate.value === "number" &&
      Number.isFinite(candidate.value)
      ? candidate.value
      : null,
    unit: candidate.unit,
    ...(typeof candidate.rawValue === "string"
      ? { rawValue: candidate.rawValue }
      : {})
  };
}

/**
 * Reads legacy numeric column widths into rich grid column metadata.
 *
 * Early importers stored grid columns as plain CSS-pixel numbers. The view
 * adapter normalizes them to `WordTableGridColumn` so the rest of the table
 * pipeline can keep consuming one width contract.
 *
 * @param columns - Unknown legacy column-width payload.
 * @returns Rich grid columns, or an empty array.
 */
function readLegacyGridColumns(
  columns: unknown
): readonly WordTableGridColumn[] {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns.map((column) => ({
    width: typeof column === "number" && Number.isFinite(column) && column > 0
      ? { value: column, unit: "px" }
      : null
  }));
}

/**
 * Resolves a Word color token to a CSS-like color value.
 *
 * @param value - Source Word color token.
 * @returns Resolved color string, or null when no concrete color is available.
 */
export function resolveQuireTableSourceColor(
  value: string | null | undefined
): string | null {
  if (!value || value === "auto") {
    return null;
  }

  return /^[0-9a-f]{6}$/iu.test(value) ? `#${value}` : value;
}

/**
 * Reads a Word table shading value from an unknown attrs payload.
 *
 * @param shading - Unknown shading value.
 * @returns Word table shading, or null.
 */
function readShading(shading: unknown): WordTableShading | null {
  if (!shading || typeof shading !== "object") {
    return null;
  }

  return shading as WordTableShading;
}

/**
 * Reads one non-array object from an unknown attribute payload.
 *
 * @param value - Candidate object.
 * @returns Read-only record or undefined.
 */
function readUnknownRecord(
  value: unknown
): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
