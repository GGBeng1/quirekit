import type { QuireTableLength } from "./types";

/**
 * Resolves normalized table cell spacing for separated table geometry.
 *
 * @param cellSpacing - Source table cell-spacing metadata.
 * @returns Non-negative CSS-pixel spacing, or zero when unresolved.
 */
export function resolveQuireTableCellSpacing(
  cellSpacing: QuireTableLength | null
): number {
  return resolveQuireTableCellSpacingOverride(cellSpacing) ?? 0;
}

/**
 * Resolves an explicit table cell-spacing override to CSS pixels.
 *
 * `null`, percentage, and automatic values do not override inherited table
 * spacing. A concrete zero value is still meaningful because row-level spacing
 * can explicitly collapse an inherited table spacing.
 *
 * @param cellSpacing - Source table or row cell-spacing metadata.
 * @returns Non-negative CSS-pixel spacing, or null when the source cannot override.
 */
export function resolveQuireTableCellSpacingOverride(
  cellSpacing: QuireTableLength | null
): number | null {
  if (
    !cellSpacing ||
    typeof cellSpacing.value !== "number" ||
    !Number.isFinite(cellSpacing.value) ||
    cellSpacing.value < 0
  ) {
    return null;
  }

  if (cellSpacing.unit === "px") {
    return cellSpacing.value;
  }

  return null;
}
