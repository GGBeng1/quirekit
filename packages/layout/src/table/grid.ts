import type {
  QuireTableGridCellConstraint,
  QuireTableGridTrack,
  QuireTableLayoutMode,
  QuireTableLength,
  QuireTableSourceColumn
} from "./types";
import { rebalanceQuireTableAutoFitWidths } from "./grid/auto-fit";

/** Options used to resolve physical table grid tracks. */
export interface QuireTableGridTrackResolutionOptions {
  /** Source columns in grid order. */
  readonly columns: readonly QuireTableSourceColumn[];
  /** Left edge for the first resolved track. */
  readonly x: number;
  /** Total available table width in CSS pixels. */
  readonly availableWidth: number;
  /** Optional separated-border gap around and between cell tracks. */
  readonly cellSpacing?: number | undefined;
  /** Declared table layout authority. */
  readonly layoutMode?: QuireTableLayoutMode | null | undefined;
  /** Intrinsic outer-width constraints in semantic cell source order. */
  readonly cellConstraints?: readonly QuireTableGridCellConstraint[] | undefined;
  /** Whether declared tracks wider than the available width shrink to fit it. */
  readonly fitToWidth?: boolean | undefined;
}

/**
 * Resolves a normalized table length to CSS pixels.
 *
 * @param width - Normalized table length, or null.
 * @param percentBase - Width used as the base for percentage values.
 * @returns Resolved CSS pixel width, or null for unresolved widths.
 */
export function resolveQuireTableWidthToCssPixels(
  width: QuireTableLength | null,
  percentBase: number
): number | null {
  if (!width || !isPositiveFiniteNumber(width.value)) {
    return null;
  }

  if (width.unit === "px") {
    return width.value;
  }

  if (width.unit === "percent") {
    return percentBase * width.value;
  }

  return null;
}

/**
 * Resolves source table columns into physical grid tracks.
 *
 * @param options - Source columns, origin, and available table width.
 * @returns Resolved grid tracks in source column order.
 */
export function resolveQuireTableGridTracks(
  options: QuireTableGridTrackResolutionOptions
): readonly QuireTableGridTrack[] {
  const cellSpacing = resolveQuireTableGridCellSpacing(options);
  const trackWidth = resolveQuireTableGridTrackWidth(options, cellSpacing);
  const resolvedWidths = options.columns.map((column) =>
    resolveQuireTableWidthToCssPixels(column.width, trackWidth)
  );
  const fixedWidth = resolvedWidths.reduce<number>(
    (total, width) => total + (width ?? 0),
    0
  );
  const unresolvedCount = resolvedWidths.filter((width) => width === null).length;
  const remainingWidth = Math.max(0, trackWidth - fixedWidth);
  const fallbackWidth = unresolvedCount === 0
    ? 0
    : remainingWidth / unresolvedCount;
  const declaredWidths = resolvedWidths.map((width) => Math.max(1, width ?? fallbackWidth));
  const baseWidths = options.fitToWidth === true
    ? fitQuireTableTrackWidths(declaredWidths, trackWidth)
    : declaredWidths;
  const hasConcreteSourceWidth = resolvedWidths.some((width) => width !== null);
  // An all-unresolved fresh grid is an equal authored preset, not permission
  // for max-content measurement to rewrite its proportions on every edit.
  const trackWidths = options.layoutMode === "auto-fit" && hasConcreteSourceWidth
    ? rebalanceQuireTableAutoFitWidths(
        baseWidths,
        options.cellConstraints ?? []
      )
    : baseWidths;
  let x = options.x + cellSpacing;

  return options.columns.map((column, index) => {
    const width = trackWidths[index] ?? 1;
    const track = {
      id: column.id,
      columnIndex: column.columnIndex,
      x,
      width
    };

    x += width + cellSpacing;
    return track;
  });
}

/**
 * Shrinks declared tracks proportionally when they exceed the available width,
 * so a fixed grid authored for a wider body stays inside a narrower column.
 *
 * @param widths - Declared track widths in source order.
 * @param trackWidth - Width available to all tracks.
 * @returns Track widths whose total does not exceed the available width.
 */
function fitQuireTableTrackWidths(
  widths: readonly number[],
  trackWidth: number
): readonly number[] {
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total <= trackWidth) {
    return widths;
  }
  const scale = trackWidth / total;
  return widths.map((width) => Math.max(1, width * scale));
}

/**
 * Resolves the cell-spacing gap used by physical table grid tracks.
 *
 * @param options - Grid resolution options.
 * @returns Non-negative cell spacing in CSS pixels.
 */
function resolveQuireTableGridCellSpacing(
  options: QuireTableGridTrackResolutionOptions
): number {
  return Math.max(0, options.cellSpacing ?? 0);
}

/**
 * Resolves the total width available to cell track boxes.
 *
 * @param options - Grid resolution options.
 * @param cellSpacing - Resolved separated-border gap.
 * @returns Available track width after outside and inside gaps.
 */
function resolveQuireTableGridTrackWidth(
  options: QuireTableGridTrackResolutionOptions,
  cellSpacing: number
): number {
  const gapCount = options.columns.length + 1;
  return Math.max(1, options.availableWidth - (cellSpacing * gapCount));
}

/**
 * Checks whether a value is a finite positive number.
 *
 * @param value - Numeric value to inspect.
 * @returns Whether the value can resolve to a positive width.
 */
function isPositiveFiniteNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
