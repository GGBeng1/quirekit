import type { QuireRect } from "@quirekit/renderer";
import { resolveQuireTableCellLineAllowance, resolveQuireTableCellSideInsets } from "./border/occupancy/lines";
import type {
  QuireTableLength,
  QuireTableLayoutInput,
  QuireTableSourceCell
} from "./types";

/** Resolved per-side cell insets in CSS pixels, including reserved border width. */
export interface QuireTableCellInsets {
  /** Top inset from the cell border edge to content. */
  readonly top: number;
  /** Right inset from the cell border edge to content. */
  readonly right: number;
  /** Bottom inset from the cell border edge to content. */
  readonly bottom: number;
  /** Left inset from the cell border edge to content. */
  readonly left: number;
}

/**
 * Resolves cell content insets from direct cell margins, table defaults, and fallbacks.
 *
 * @param input - Table source and layout constraints.
 * @param cell - Source cell whose margins should be resolved.
 * @param rect - Full cell rectangle used as percentage base for margin lengths.
 * @returns Per-side content insets including the space of the table lines.
 */
export function resolveQuireTableCellInsets(
  input: QuireTableLayoutInput,
  cell: QuireTableSourceCell,
  rect: QuireRect
): QuireTableCellInsets {
  const direct = cell.cellMargins;
  const inherited = input.source.defaultCellMargins;
  const fallback = input.constraints.defaultCellPadding;
  const margin = (side: keyof QuireTableCellInsets) =>
    resolveQuireTableCellMargin(direct?.[side] ?? inherited?.[side] ?? null, rect.width, fallback);
  const lines = resolveQuireTableCellLineAllowance(input, cell);
  const sides = resolveQuireTableCellSideInsets(input, cell, { left: margin("left"), right: margin("right") });

  return {
    top: margin("top") + lines.top,
    right: sides.right,
    bottom: margin("bottom") + lines.bottom,
    left: sides.left
  };
}

/**
 * Resolves a positive explicit row height, shared by minimum and exact rules.
 *
 * The caller applies the row rule: exact sizes constrain the border box,
 * while minimum sizes can grow to fit content.
 *
 * @param height - Source row height metadata.
 * @returns CSS-pixel explicit height, or null when automatic or invalid.
 */
export function resolveQuireTableRowHeightFloor(
  height: QuireTableLayoutInput["source"]["rows"][number]["height"]
): number | null {
  if (
    !height ||
    height.rule === "auto" ||
    !Number.isFinite(height.value) ||
    height.value <= 0
  ) {
    return null;
  }

  return height.value;
}

/**
 * Resolves one cell margin side to CSS pixels.
 *
 * @param margin - Normalized margin length, or null for inherited/default value.
 * @param percentBase - Length used as the base for percentage values.
 * @param fallback - Fallback CSS-pixel margin when the source length is unresolved.
 * @returns Resolved CSS-pixel margin.
 */
function resolveQuireTableCellMargin(
  margin: QuireTableLength | null,
  percentBase: number,
  fallback: number
): number {
  const value = resolveTableLengthToCssPixels(margin, percentBase);
  return value ?? fallback;
}

/**
 * Resolves a normalized table length without treating zero as inherited.
 *
 * @param length - Normalized length, or null.
 * @param percentBase - Length used as the base for percentage values.
 * @returns CSS-pixel length, or null when unresolved.
 */
function resolveTableLengthToCssPixels(
  length: QuireTableLength | null,
  percentBase: number
): number | null {
  if (
    !length ||
    typeof length.value !== "number" ||
    !Number.isFinite(length.value) ||
    length.value < 0
  ) {
    return null;
  }

  if (length.unit === "px") {
    return length.value;
  }

  if (length.unit === "percent") {
    return percentBase * length.value;
  }

  return null;
}
