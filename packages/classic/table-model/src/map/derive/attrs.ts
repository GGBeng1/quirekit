import type { Node as PMNode } from "@quirekit/pm";
import { createWordTableMapDiagnostic } from "../diagnostics";
import type { WordTableMapDiagnostic } from "../types";

/**
 * Reads the declared grid width from table attrs.
 *
 * @param tableNode - Source table node.
 * @returns Declared grid width, or zero when absent.
 */
export function getDeclaredGridWidth(tableNode: PMNode): number {
  const grid = tableNode.attrs.grid;
  const legacyColumns = tableNode.attrs.legacyColumns ?? tableNode.attrs.columns;

  if (Array.isArray(grid)) {
    return grid.length;
  }

  return Array.isArray(legacyColumns) ? legacyColumns.length : 0;
}

/**
 * Reads a non-negative row offset attr.
 *
 * @param attrs - Source attrs.
 * @param name - Attribute name.
 * @param rowIndex - Row index used for diagnostics.
 * @param diagnostics - Mutable diagnostics output.
 * @returns Non-negative offset count.
 */
export function readGridOffset(
  attrs: Readonly<Record<string, unknown>>,
  name: "gridBefore" | "gridAfter",
  rowIndex: number,
  diagnostics: WordTableMapDiagnostic[]
): number {
  const value = attrs[name];

  if (value === null || value === undefined) {
    return 0;
  }

  if (Number.isInteger(value) && (value as number) >= 0) {
    return value as number;
  }

  diagnostics.push(createWordTableMapDiagnostic({
    code: "invalid-grid-offset",
    message: `${name} must be a non-negative integer.`,
    rowIndex
  }));

  return 0;
}

/**
 * Reads a positive integer value.
 *
 * @param value - Unknown source value.
 * @param fallback - Value returned when source is invalid.
 * @returns Positive integer.
 */
export function readPositiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && (value as number) > 0
    ? value as number
    : fallback;
}

/**
 * Reads a Word vertical merge marker.
 *
 * @param value - Unknown source value.
 * @returns Normalized vertical merge marker.
 */
export function readVerticalMerge(value: unknown): "restart" | "continue" | null {
  return value === "restart" || value === "continue" ? value : null;
}

/**
 * Reports whether a cell has meaningful textual content.
 *
 * @param cellNode - Source cell node.
 * @returns True when text content is non-empty after trimming.
 */
export function hasMeaningfulContent(cellNode: PMNode): boolean {
  return cellNode.textContent.trim().length > 0;
}
