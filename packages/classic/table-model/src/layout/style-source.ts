import type { Node as PMNode } from "@quirekit/pm";
import { completeWordTableStyleBorders, completeWordTableStyleMargins, resolveWordTableStyleAppearance } from "../style";
import type { WordTableMap } from "../map/types";
import type { WordTableStyleBorders, WordTableStyleMargins, WordTableStyleRegistry } from "../style/types";
import type { WordTableVerticalAlignment } from "../types";
import type {
  QuireTableBorders,
  QuireTableCellMargins,
  QuireTableShading
} from "@quirekit/layout/table";
import {
  normalizeWordTableBorders,
  normalizeWordTableCellMargins,
  normalizeWordTableShading
} from "./normalization";

/** Style-derived inputs for one semantic cell. */
export interface QuireTableStyleCellInputs {
  /** Style cell borders on the cell's physical edges, below direct cell borders. */
  readonly styleBorders: QuireTableBorders | null;
  /** Style shading, used only when the cell has no direct fill. */
  readonly shading: QuireTableShading | null;
  /** Style cell margins, merged per side below direct cell margins. */
  readonly cellMargins: QuireTableCellMargins | null;
  /** Style vertical alignment, used when the cell has none. */
  readonly verticalAlign: WordTableVerticalAlignment | null;
  /** Style no-wrap flag, used when the cell has none. */
  readonly noWrap: boolean | null;
}

/** Style-derived inputs for one table instance. */
export interface QuireTableStyleSourceInputs {
  /** Style table borders, below direct table borders. */
  readonly tableBorders: QuireTableBorders | null;
  /** Style default cell margins, below direct table margins. */
  readonly tableCellMargins: QuireTableCellMargins | null;
  /** Per-semantic-cell inputs keyed by semantic cell id. */
  readonly cells: ReadonlyMap<string, QuireTableStyleCellInputs>;
}

/**
 * Resolves table-style inputs for layout from the live document registry.
 *
 * @param tableNode - Source Word table node.
 * @param tableMap - Derived table map.
 * @param registry - Document table-style registry, when the schema declares one.
 * @returns Style inputs, or null when the document has no table-style registry.
 */
export function resolveQuireTableStyleSourceInputs(
  tableNode: PMNode,
  tableMap: WordTableMap,
  registry: WordTableStyleRegistry | undefined
): QuireTableStyleSourceInputs | null {
  if (registry === undefined) return null;
  // The map derives from the immutable node, so node and registry identify the result.
  let byRegistry = styleSourceInputs.get(tableNode);
  if (byRegistry === undefined) styleSourceInputs.set(tableNode, byRegistry = new WeakMap());
  let inputs = byRegistry.get(registry);
  if (inputs === undefined) byRegistry.set(registry, inputs = resolveStyleSourceInputs(tableNode, tableMap, registry));
  return inputs;
}

/** Style inputs by immutable table node and registry. */
const styleSourceInputs = new WeakMap<PMNode, WeakMap<WordTableStyleRegistry, QuireTableStyleSourceInputs>>();

/**
 * Resolves table-style inputs without consulting the cache.
 *
 * @param tableNode - Source Word table node.
 * @param tableMap - Derived table map.
 * @param registry - Document table-style registry.
 * @returns Style inputs for the table and its semantic cells.
 */
function resolveStyleSourceInputs(
  tableNode: PMNode,
  tableMap: WordTableMap,
  registry: WordTableStyleRegistry
): QuireTableStyleSourceInputs {
  const appearance = resolveWordTableStyleAppearance({
    registry,
    map: tableMap,
    styleId: tableNode.attrs.tableStyle,
    tableLook: tableNode.attrs.tableLook,
    styleBandSize: tableNode.attrs.styleBandSize
  });
  const cells = new Map<string, QuireTableStyleCellInputs>();
  for (const [id, cell] of appearance.cells) {
    cells.set(id, {
      styleBorders: toQuireBorders(cell.borders),
      shading: cell.shading === null ? null : normalizeWordTableShading(cell.shading),
      cellMargins: toQuireMargins(cell.cellMargins),
      verticalAlign: cell.verticalAlign,
      noWrap: cell.noWrap
    });
  }
  return {
    tableBorders: toQuireBorders(appearance.table.borders ?? {}),
    tableCellMargins: toQuireMargins(appearance.table.cellMargins ?? {}),
    cells
  };
}

/**
 * Converts partial style borders into neutral layout borders.
 *
 * @param borders - Partial style borders.
 * @returns Layout borders, or null when no side is declared.
 */
function toQuireBorders(borders: WordTableStyleBorders): QuireTableBorders | null {
  const complete = completeWordTableStyleBorders(borders);
  return complete === null ? null : normalizeWordTableBorders(complete);
}

/**
 * Converts partial style margins into neutral layout margins.
 *
 * @param margins - Partial style margins.
 * @returns Layout margins, or null when no side is declared.
 */
function toQuireMargins(margins: WordTableStyleMargins): QuireTableCellMargins | null {
  const complete = completeWordTableStyleMargins(margins);
  return complete === null ? null : normalizeWordTableCellMargins(complete);
}
