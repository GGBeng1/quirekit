import type { WordTableMap } from "../../map";
import type {
  WordTableBorder,
  WordTableShading,
  WordTableUnknownRecord,
  WordTableVerticalAlignment
} from "../../types";
import { resolveWordTableStyle } from "./chain";
import { resolveWordTableStyleLook } from "./look";
import { mergeUnknownRecord } from "./merge";
import {
  classifyWordTableCellRegions,
  countCellsPerRow,
  wholeTableEdges,
  wordTableStyleRegionOrder,
  type WordTableCellEdge,
  type WordTableCellRegion
} from "./regions";
import type {
  WordTableStyleAppearance,
  WordTableStyleBorders,
  WordTableStyleCellAppearance,
  WordTableStyleCellPatch,
  WordTableStyleMargins,
  WordTableStyleRegionType,
  WordTableStyleRegistry
} from "../types";

/** Inputs for resolving one table instance's style-derived appearance. */
export interface ResolveWordTableStyleAppearanceInput {
  /** Document table-style registry. */
  readonly registry: WordTableStyleRegistry;
  /** Table grid map. */
  readonly map: WordTableMap;
  /** `wordTable.attrs.tableStyle`. */
  readonly styleId: unknown;
  /** `wordTable.attrs.tableLook`. */
  readonly tableLook: unknown;
  /** `wordTable.attrs.styleBandSize`, whose direct values override the style. */
  readonly styleBandSize?: unknown;
}

const cellEdges: readonly WordTableCellEdge[] = ["top", "right", "bottom", "left"];

/**
 * Resolves the style-derived appearance of every semantic cell in one table.
 *
 * Pure function of its inputs: the result is transient view input and is never
 * written back to nodes. Direct table, row and cell formatting stays separate
 * so each renderer can layer it above the style tiers.
 *
 * @param input - Registry, map, and table instance attributes.
 * @returns Style appearance for the table and each semantic cell.
 */
export function resolveWordTableStyleAppearance(
  input: ResolveWordTableStyleAppearanceInput
): WordTableStyleAppearance {
  const styleId = typeof input.styleId === "string" && input.styleId.length > 0 ? input.styleId : null;
  const style = resolveWordTableStyle(input.registry, styleId);
  const look = resolveWordTableStyleLook(input.tableLook);
  const bandSize = readBandSize(input.styleBandSize);
  const regionsByCell = classifyWordTableCellRegions({
    map: input.map,
    look,
    rowBandSize: bandSize.row ?? style.base.table?.rowBandSize ?? 0,
    columnBandSize: bandSize.column ?? style.base.table?.columnBandSize ?? 0,
    hasFirstColumnRegion: style.regions.firstColumn !== undefined
  });

  // Word applies conditional tcMar/vAlign/noWrap to whole rows, so collect the
  // region types that touch each row before resolving individual cells.
  const rowRegionTypes = new Map<number, Set<WordTableStyleRegionType>>();
  for (const cell of input.map.semanticCells) {
    for (let row = cell.rect.startRow; row < cell.rect.startRow + cell.rect.rowSpan; row++) {
      const types = rowRegionTypes.get(row) ?? new Set();
      for (const region of regionsByCell.get(cell.id) ?? []) types.add(region.type);
      rowRegionTypes.set(row, types);
    }
  }

  const lastRow = input.map.height - 1;
  const cellsPerRow = countCellsPerRow(input.map);
  const explicitById = new Map(input.map.explicitCells.map(cell => [cell.id, cell]));
  const cells = new Map<string, WordTableStyleCellAppearance>();
  for (const cell of input.map.semanticCells) {
    const origin = explicitById.get(cell.originExplicitCellId);
    if (origin === undefined) continue;
    const regions = regionsByCell.get(cell.id) ?? [];
    const baseRegion: WordTableCellRegion = {
      type: "wholeTable",
      edges: wholeTableEdges(
        cell,
        lastRow,
        origin.cellIndex === 0,
        origin.cellIndex === (cellsPerRow.get(origin.rowIndex) ?? 1) - 1
      )
    };
    const applied = [
      { region: baseRegion, formatting: style.base },
      ...regions.flatMap(region => {
        const formatting = style.regions[region.type];
        return formatting === undefined ? [] : [{ region, formatting }];
      })
    ];

    let borders: Record<string, WordTableBorder> = {};
    let shading: WordTableShading | null = null;
    let paragraph: WordTableUnknownRecord | null = null;
    let text: WordTableUnknownRecord | null = null;
    for (const { region, formatting } of applied) {
      borders = mapRegionBorders(borders, region, formatting.cell?.borders);
      shading = formatting.cell?.shading ?? shading;
      paragraph = mergeUnknownRecord(paragraph, formatting.paragraph);
      text = mergeUnknownRecord(text, formatting.text);
    }

    const rowTypes = rowRegionTypes.get(cell.rect.startRow) ?? new Set();
    const rowScoped = [
      style.base.cell,
      ...wordTableStyleRegionOrder
        .filter(type => rowTypes.has(type))
        .map(type => style.regions[type]?.cell ?? null)
    ];
    cells.set(cell.id, {
      semanticCellId: cell.id,
      regions: regions.map(region => region.type),
      borders,
      shading,
      ...resolveRowScopedCell(rowScoped),
      paragraph,
      text
    });
  }

  return {
    styleId: style.chain.at(-1) ?? null,
    look,
    table: style.base.table ?? {},
    cells
  };
}

/**
 * Maps one region's `tcBorders` onto a cell's physical edges.
 *
 * An edge on the region boundary takes the matching outer side, an edge inside
 * the region takes `insideH`/`insideV`, and an edge outside the region is left
 * untouched. Diagonals are cell-local and map directly.
 *
 * @param current - Borders accumulated from earlier regions.
 * @param region - Region instance and edge states for this cell.
 * @param source - Region `tcBorders`, when declared.
 * @returns Borders after this region.
 */
function mapRegionBorders(
  current: Record<string, WordTableBorder>,
  region: WordTableCellRegion,
  source: WordTableStyleBorders | undefined
): Record<string, WordTableBorder> {
  if (source === undefined) return current;
  const next = { ...current };
  for (const edge of cellEdges) {
    const state = region.edges[edge];
    if (state === "outside") continue;
    const side = state === "boundary"
      ? edge
      : edge === "top" || edge === "bottom" ? "insideH" : "insideV";
    const border = source[side];
    if (border !== undefined) next[edge] = border;
  }
  if (source.tl2br !== undefined) next.tl2br = source.tl2br;
  if (source.tr2bl !== undefined) next.tr2bl = source.tr2bl;
  return next;
}

/**
 * Merges row-scoped cell properties in application order.
 *
 * @param patches - Baseline then region cell patches for the cell's row.
 * @returns Effective margins, vertical alignment, and no-wrap.
 */
function resolveRowScopedCell(
  patches: readonly (WordTableStyleCellPatch | null)[]
): { cellMargins: WordTableStyleMargins; verticalAlign: WordTableVerticalAlignment | null; noWrap: boolean | null } {
  let cellMargins: WordTableStyleMargins = {};
  let verticalAlign: WordTableVerticalAlignment | null = null;
  let noWrap: boolean | null = null;
  for (const patch of patches) {
    if (patch === null) continue;
    if (patch.cellMargins !== undefined) cellMargins = { ...cellMargins, ...patch.cellMargins };
    verticalAlign = patch.verticalAlign ?? verticalAlign;
    noWrap = patch.noWrap ?? noWrap;
  }
  return { cellMargins, verticalAlign, noWrap };
}

/**
 * Reads direct band sizes from `wordTable.attrs.styleBandSize`.
 *
 * @param value - Candidate attribute.
 * @returns Direct row and column band sizes when declared.
 */
function readBandSize(value: unknown): { row?: number; column?: number } {
  if (value === null || typeof value !== "object") return {};
  const record = value as Readonly<Record<string, unknown>>;
  return {
    ...(typeof record.row === "number" && record.row >= 0 ? { row: record.row } : {}),
    ...(typeof record.column === "number" && record.column >= 0 ? { column: record.column } : {})
  };
}
