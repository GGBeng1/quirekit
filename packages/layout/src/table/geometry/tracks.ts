import { resolveQuireTableGridTracks } from "../grid";
import { resolveQuireTableCellInsets } from "../metrics";
import { resolveQuireTableCellSpacing, resolveQuireTableCellSpacingOverride } from "../spacing";
import type {
  QuireTableGridCellConstraint,
  QuireTableGridTrack,
  QuireTableLayoutInput,
  QuireTableSourceCell
} from "../types";
import type { QuireTablePlacement } from "./placement";

/** Track and spacing facts shared by measurement and fragment phases. */
export interface QuireTableTrackLayout {
  /** Table-level default separated-border spacing. */
  readonly cellSpacing: number;
  /** Effective separated-border spacing in source-row order. */
  readonly rowCellSpacings: readonly number[];
  /** Canonical table tracks using the table-level spacing. */
  readonly tracks: readonly QuireTableGridTrack[];
  /** Row-local tracks accounting for row spacing overrides. */
  readonly rowTracks: readonly (readonly QuireTableGridTrack[])[];
}

/**
 * Resolves table tracks and row-local spacing before cell measurement.
 *
 * @param input - Table source and optional retained track resolver.
 * @param placement - Resolved table placement.
 * @returns Track facts consumed by later geometry phases.
 */
export function resolveQuireTableTrackLayout(
  input: QuireTableLayoutInput,
  placement: QuireTablePlacement
): QuireTableTrackLayout {
  const cellSpacing = resolveQuireTableCellSpacing(input.source.cellSpacing);
  const rowCellSpacings = input.source.rows.map((row) =>
    resolveQuireTableCellSpacingOverride(row.cellSpacing) ?? cellSpacing
  );
  const cellConstraints = createQuireTableGridCellConstraints(
    input,
    placement.width
  );
  const tracks = resolveTableGridTracks(input, {
    columns: input.source.columns,
    x: placement.x,
    availableWidth: placement.width,
    cellSpacing,
    layoutMode: input.source.layoutMode,
    cellConstraints,
    fitToWidth: input.constraints.fitToWidth
  });
  const rowTracks = input.source.rows.map((_, index) =>
    resolveTableGridTracks(input, {
      columns: input.source.columns,
      x: placement.x,
      availableWidth: placement.width,
      cellSpacing: rowCellSpacings[index],
      layoutMode: input.source.layoutMode,
      cellConstraints,
      fitToWidth: input.constraints.fitToWidth
    })
  );

  return { cellSpacing, rowCellSpacings, tracks, rowTracks };
}

/**
 * Reads the row-local tracks used by a source cell.
 *
 * @param rowTracks - Resolved track sets in source row order.
 * @param cell - Source cell whose start row selects the track set.
 * @param fallbackTracks - Fallback tracks used when the start row is absent.
 * @returns Row-local tracks for the source cell.
 */
export function readQuireTableCellRowTracks(
  rowTracks: readonly (readonly QuireTableGridTrack[])[],
  cell: QuireTableSourceCell,
  fallbackTracks: readonly QuireTableGridTrack[]
): readonly QuireTableGridTrack[] {
  return rowTracks[cell.gridRect.startRow] ?? fallbackTracks;
}

/**
 * Resolves physical tracks through the retained authority when supplied.
 *
 * @param input - Table input carrying the optional retained resolver.
 * @param request - Normalized columns and exact table geometry.
 * @returns Physical tracks in source column order.
 */
function resolveTableGridTracks(
  input: QuireTableLayoutInput,
  request: Parameters<typeof resolveQuireTableGridTracks>[0]
): readonly QuireTableGridTrack[] {
  return input.resolveGridTracks?.({
    columns: request.columns,
    x: request.x,
    availableWidth: request.availableWidth,
    cellSpacing: request.cellSpacing ?? 0,
    layoutMode: request.layoutMode ?? null,
    cellConstraints: request.cellConstraints ?? [],
    inlineMetricsSignature: input.inlineMetricsSignature ?? null,
    fitToWidth: request.fitToWidth
  }) ?? resolveQuireTableGridTracks(request);
}

/**
 * Creates outer-width constraints from shaped content and effective cell insets.
 *
 * @param input - Table source, layout fallbacks, and measured cell metrics.
 * @param tableWidth - Resolved table width used as the percentage inset base.
 * @returns Semantic cell constraints in source order.
 */
function createQuireTableGridCellConstraints(
  input: QuireTableLayoutInput,
  tableWidth: number
): readonly QuireTableGridCellConstraint[] {
  if (input.source.layoutMode !== "auto-fit" || !input.cellInlineMetrics) {
    return [];
  }

  const rect = { x: 0, y: 0, width: tableWidth, height: 0 };
  const constraints: QuireTableGridCellConstraint[] = [];

  for (const cell of input.source.semanticCells) {
    const metrics = input.cellInlineMetrics.get(cell.id);
    if (!metrics) {
      continue;
    }

    const insets = resolveQuireTableCellInsets(input, cell, rect);
    const horizontalInsets = insets.left + insets.right;
    const maxContentWidth = Math.max(
      metrics.minContentWidth,
      metrics.maxContentWidth
    );

    constraints.push({
      id: cell.id,
      startColumn: cell.gridRect.startColumn,
      columnSpan: cell.gridRect.columnSpan,
      minWidth: (cell.noWrap ? maxContentWidth : metrics.minContentWidth)
        + horizontalInsets,
      maxWidth: maxContentWidth + horizontalInsets
    });
  }

  return constraints;
}
