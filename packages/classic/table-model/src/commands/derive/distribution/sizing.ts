import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMap } from "../../../map";
import type { WordTableMeasuredSizing, WordTableDistributionRange } from "./types";

/** @param value - Numeric measurement. @returns Whether it is positive and finite. */
export function positiveMeasurement(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Validates source dimensions and canonical topology without repairing the user's table.
 * @param table - Current source table.
 * @param sizing - Unscaled retained measurements.
 * @returns Whether all measurements can safely enter a canonical transform.
 */
export function validMeasuredSizing(table: PMNode, sizing: WordTableMeasuredSizing): boolean {
  const map = createWordTableMap(table);
  return map.diagnostics.length === 0
    && sizing.columnWidths.length === map.width
    && sizing.rowHeights.length === map.height
    && positiveMeasurement(sizing.width) && Number.isSafeInteger(Math.round(sizing.width * 15))
    && sizing.columnWidths.every(positiveMeasurement)
    && sizing.rowHeights.every(positiveMeasurement)
    && sizing.cellMinimumHeights.every(cell => Number.isSafeInteger(cell.startRow)
      && Number.isSafeInteger(cell.rowSpan) && cell.startRow >= 0 && cell.rowSpan > 0
      && cell.startRow + cell.rowSpan <= map.height
      && Number.isFinite(cell.height) && cell.height >= 0);
}

/**
 * Requires at least two logical rows or columns.
 * @param from - First source index.
 * @param to - Inclusive last index.
 * @param count - Available source dimension.
 * @returns Validated range or null.
 */
export function distributionRange(from: number, to: number | undefined, count: number): WordTableDistributionRange | null {
  return Number.isSafeInteger(from) && Number.isSafeInteger(to)
    && from >= 0 && to! > from && to! < count ? { from, to: to! } : null;
}
