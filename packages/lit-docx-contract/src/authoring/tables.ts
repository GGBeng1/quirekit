import type { LitAstNode } from "../core/contracts.js";
import type {
  DocxSingleCellContainerOptions,
  DocxTableCellOptions,
  DocxTableMeasurement,
  DocxTablesApi
} from "./types.js";
import { createDocxStylesApi } from "./styles.js";
import { normalizeCellBorders, normalizeCellContent } from './table/normalize.js';

const FULL_WIDTH_TABLE_MEASUREMENT = Object.freeze({
  value: 5000,
  type: "pct" as const
});
const DEFAULT_SINGLE_CELL_GRID_WIDTH_DXA = 9360;

/**
 * Creates the semantic table operation family.
 *
 * @returns Immutable table builders.
 */
export function createDocxTablesApi(): DocxTablesApi {
  const styles = createDocxStylesApi();
  const cell = (options: DocxTableCellOptions = {}): LitAstNode =>
    createCell(options);
  const api: DocxTablesApi = {
    table: (options) => Object.freeze({
      type: "table",
      children: freezeNodes(options.rows),
      attrs: Object.freeze({
        ...(options.width === undefined
          ? {}
          : { width: freezeTableMeasurement(options.width) }),
        ...(options.layout === undefined
          ? {}
          : {
              tableLayout: options.layout === "auto"
                ? "autofit"
                : options.layout
            }),
        ...(options.columns === undefined
          ? {}
          : { columns: Object.freeze([...options.columns]) })
      })
    }),
    row: (options) => Object.freeze({
      type: "tableRow",
      children: freezeNodes(options.cells),
      attrs: Object.freeze({
        ...(options.isHeader === undefined
          ? {}
          : { isHeader: options.isHeader }),
        ...(options.height === undefined ? {} : { height: options.height }),
        ...(options.cantSplit === undefined
          ? {}
          : { cantSplit: options.cantSplit })
      })
    }),
    cell,
    shadedCell: (options) => cell({
      ...options,
      shading: styles.shading({ fill: options.fill })
    }),
    singleCellContainer: (options) =>
      createSingleCellContainer(options, api)
  };
  return Object.freeze(api);
}

/**
 * Creates one immutable cell and guarantees legal block content.
 *
 * @param options - Cell content and properties.
 * @returns Semantic table-cell node.
 */
function createCell(options: DocxTableCellOptions): LitAstNode {
  const children = normalizeCellContent(options.children);
  return Object.freeze({
    type: "tableCell",
    children: freezeNodes(children),
    attrs: Object.freeze({
      ...(options.colspan === undefined ? {} : { colspan: options.colspan }),
      ...(options.rowspan === undefined ? {} : { rowspan: options.rowspan }),
      ...(options.width === undefined
        ? {}
        : { width: freezeTableMeasurement(options.width) }),
      ...(options.shading === undefined
        ? {}
        : { shading: Object.freeze({ ...options.shading }) }),
      ...(options.borders === undefined
        ? {}
        : { borders: normalizeCellBorders(options.borders) }),
      ...(options.verticalAlign === undefined
        ? {}
        : { verticalAlign: options.verticalAlign })
    })
  });
}

/**
 * Creates the one-row, one-cell portable container recipe.
 *
 * @param options - Container content and appearance.
 * @param api - Table builders used to retain one construction path.
 * @returns Semantic table node.
 */
function createSingleCellContainer(
  options: DocxSingleCellContainerOptions,
  api: DocxTablesApi
): LitAstNode {
  const width = options.width ?? FULL_WIDTH_TABLE_MEASUREMENT;
  const gridWidth = resolveGridWidthDxa(width);
  const borders = options.border === undefined
    ? undefined
    : Object.freeze({
        top: options.border,
        right: options.border,
        bottom: options.border,
        left: options.border
      });
  return api.table({
    rows: [api.row({
      cells: [api.cell({
        children: options.children,
        width,
        ...(options.shading === undefined
          ? {}
          : { shading: options.shading }),
        ...(borders === undefined ? {} : { borders })
      })]
    })],
    width,
    columns: [gridWidth],
    layout: "auto"
  });
}

/**
 * Resolves the deterministic dxa seed required by `w:tblGrid`.
 *
 * Percentage preferred widths remain authoritative for final sizing. The grid
 * seed only prevents consumers from reconstructing a zero-width column.
 *
 * @param width - Public table measurement.
 * @returns Positive dxa width for the one-column grid.
 */
function resolveGridWidthDxa(width: DocxTableMeasurement): number {
  if (typeof width === "number") {
    return Number.isFinite(width) && width > 0
      ? width
      : DEFAULT_SINGLE_CELL_GRID_WIDTH_DXA;
  }
  return width.type === "dxa"
    && Number.isFinite(width.value)
    && width.value > 0
    ? width.value
    : DEFAULT_SINGLE_CELL_GRID_WIDTH_DXA;
}

/**
 * Freezes structured table measurements before they enter immutable LitAST.
 *
 * @param width - Public table measurement.
 * @returns Immutable numeric shorthand or typed width record.
 */
function freezeTableMeasurement(
  width: DocxTableMeasurement
): DocxTableMeasurement {
  return typeof width === "number"
    ? width
    : Object.freeze({ ...width });
}

/**
 * Copies and freezes semantic nodes.
 *
 * @param nodes - Source nodes.
 * @returns Immutable node sequence.
 */
function freezeNodes(nodes: readonly LitAstNode[]): readonly LitAstNode[] {
  return Object.freeze([...nodes]);
}
