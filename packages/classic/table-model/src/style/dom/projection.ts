import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableMap } from "../../map";
import type {
  WordTableBorder,
  WordTableBorders,
  WordTableShading,
  WordTableUnknownRecord,
  WordTableWidth
} from "../../types";
import { resolveWordTableStyleAppearance } from "../resolve/appearance";
import { resolveWordTableEdgeBorder } from "../resolve/edges";
import type { WordTableCellEdge } from "../resolve/regions";
import type { WordTableStyleRegistry } from "../types";

/** Inline CSS for one explicit cell, addressed by row and cell index. */
export interface WordTableCellHtmlStyle {
  /** Row index of the explicit cell. */
  readonly rowIndex: number;
  /** Cell index within the row. */
  readonly cellIndex: number;
  /** Complete inline style declaration. */
  readonly style: string;
  /** Table-style paragraph delta for paragraphs in this cell, when any. */
  readonly paragraph: WordTableUnknownRecord | null;
  /** Table-style text delta for paragraphs in this cell, when any. */
  readonly text: WordTableUnknownRecord | null;
}

const cssBorderStyles: Readonly<Record<string, string>> = Object.freeze({
  single: "solid",
  thick: "solid",
  double: "double",
  dotted: "dotted",
  dashed: "dashed",
  dashSmallGap: "dashed",
  dotDash: "dashed",
  dotDotDash: "dotted"
});

const edges: readonly WordTableCellEdge[] = ["top", "right", "bottom", "left"];

/**
 * Resolves the HTML appearance of every explicit cell in one styled table.
 *
 * Each edge takes the first declared border among direct cell borders, table
 * style cell borders, and table borders (direct over style, outer side on the
 * table edge, inside side elsewhere). Browsers collapse the two adjacent cell
 * edges; the table style tiers stay aligned with Canvas and SVG.
 *
 * @param tableNode - Word table node.
 * @param map - Table map of the node.
 * @param registry - Document table-style registry.
 * @returns Cell styles, or null when no table style applies to the table.
 */
export function resolveWordTableCellHtmlStyles(
  tableNode: PMNode,
  map: WordTableMap,
  registry: WordTableStyleRegistry
): readonly WordTableCellHtmlStyle[] | null {
  const appearance = resolveWordTableStyleAppearance({
    registry,
    map,
    styleId: tableNode.attrs.tableStyle,
    tableLook: tableNode.attrs.tableLook,
    styleBandSize: tableNode.attrs.styleBandSize
  });
  if (appearance.styleId === null) return null;

  const directTable = (tableNode.attrs.borders ?? null) as WordTableBorders | null;
  const styleTable = appearance.table.borders ?? {};
  const tableMargins = {
    ...(appearance.table.cellMargins ?? {}),
    ...compactMargins(tableNode.attrs.defaultCellMargins)
  };
  const explicitById = new Map(map.explicitCells.map(cell => [cell.id, cell]));
  const styles: WordTableCellHtmlStyle[] = [];

  for (const semantic of map.semanticCells) {
    const origin = explicitById.get(semantic.originExplicitCellId);
    const cellNode = origin === undefined ? null : tableNode.maybeChild(origin.rowIndex)?.maybeChild(origin.cellIndex);
    const cellAppearance = appearance.cells.get(semantic.id);
    if (origin === undefined || cellNode == null || cellAppearance === undefined) continue;
    const directCell = (cellNode.attrs.borders ?? null) as WordTableBorders | null;
    const rowCells = tableNode.maybeChild(origin.rowIndex)?.childCount ?? 1;
    const bottomRow = semantic.rect.startRow + semantic.rect.rowSpan - 1;
    const outer: Readonly<Record<WordTableCellEdge, boolean>> = {
      top: semantic.rect.startRow === 0,
      bottom: bottomRow === map.height - 1,
      left: origin.cellIndex === 0,
      right: origin.cellIndex === rowCells - 1
    };
    const declarations: string[] = [];
    for (const edge of edges) {
      const border = resolveWordTableEdgeBorder(edge, outer[edge], {
        directCell,
        styleCell: cellAppearance.borders,
        directTable,
        styleTable
      });
      declarations.push(`border-${edge}: ${toCssBorder(border)}`);
    }
    const shading = (cellNode.attrs.shading ?? null) as WordTableShading | null;
    const background = toCssColor(shading?.fill ?? cellNode.attrs.backgroundColor ?? null)
      ?? toCssColor(cellAppearance.shading?.fill ?? null);
    declarations.push(`background-color: ${background ?? "transparent"}`);
    const margins = { ...tableMargins, ...cellAppearance.cellMargins, ...compactMargins(cellNode.attrs.cellMargins) };
    declarations.push(`padding: ${edges.map(edge => toCssLength(margins[edge])).join(" ")}`);
    const verticalAlign = cellNode.attrs.verticalAlign ?? cellAppearance.verticalAlign;
    if (verticalAlign !== null) {
      declarations.push(`vertical-align: ${verticalAlign === "center" ? "middle" : verticalAlign}`);
    }
    styles.push({
      rowIndex: origin.rowIndex,
      cellIndex: origin.cellIndex,
      style: declarations.join("; "),
      paragraph: cellAppearance.paragraph,
      text: cellAppearance.text
    });
  }
  return styles;
}

/**
 * Converts a Word border into a CSS border shorthand.
 *
 * @param border - Word border, or null for no border.
 * @returns CSS border value.
 */
function toCssBorder(border: WordTableBorder | null): string {
  if (border === null || border.style === "nil" || border.style === "none") return "none";
  const width = border.size === null ? 0.5 : Math.max(border.size / 8, 0.25);
  const style = cssBorderStyles[border.style] ?? "solid";
  return `${width}pt ${style} ${toCssColor(border.color) ?? "#000000"}`;
}

/**
 * Converts a Word color token into CSS.
 *
 * @param color - RGB hex or `auto`.
 * @returns CSS color, or null for automatic or invalid values.
 */
function toCssColor(color: unknown): string | null {
  return typeof color === "string" && /^[\da-f]{6}$/iu.test(color) ? `#${color}` : null;
}

/**
 * Converts a twip width into CSS points.
 *
 * @param width - Word width.
 * @returns CSS length.
 */
function toCssLength(width: WordTableWidth | undefined): string {
  return width?.unit === "dxa" && width.value !== null ? `${width.value / 20}pt` : "0";
}

/**
 * Keeps only declared margin sides.
 *
 * @param value - Candidate margin map.
 * @returns Declared sides.
 */
function compactMargins(value: unknown): Partial<Record<WordTableCellEdge, WordTableWidth>> {
  if (value === null || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, side]) => side !== null && side !== undefined)
  ) as Partial<Record<WordTableCellEdge, WordTableWidth>>;
}
