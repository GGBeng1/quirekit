import type { ClassicEditorStatusMode, ClassicEditorStatusTarget } from "./types";

/**
 * Reads one structured status target without interpreting node names or target ids.
 *
 * @param value - Candidate semantic snapshot value.
 * @returns Valid structured fact, or null when the producer has not published one.
 */
export function readClassicEditorStatusTarget(value: unknown): ClassicEditorStatusTarget | null {
  if (!isRecord(value) || !isStatusKind(value.kind)) return null;
  if (value.label !== undefined && typeof value.label !== "string") return null;
  if (value.reason !== undefined && typeof value.reason !== "string") return null;
  if (value.locked !== undefined && typeof value.locked !== "boolean") return null;
  if (value.mode !== undefined && !isStatusMode(value.mode)) return null;
  const shared = {
    ...(typeof value.label === "string" ? { label: value.label } : {}),
    ...(typeof value.reason === "string" ? { reason: value.reason } : {}),
    ...(typeof value.locked === "boolean" ? { locked: value.locked } : {}),
    ...(isStatusMode(value.mode) ? { mode: value.mode } : {})
  };
  if (value.kind === "text") {
    return isNonNegativeInteger(value.count)
      ? { ...shared, kind: "text", count: value.count }
      : null;
  }
  if (value.kind === "table") {
    if (!areOptionalPositiveIntegers(
      value.rows,
      value.columns,
      value.row,
      value.column,
      value.selectedCells
    )) return null;
    return {
      ...shared,
      kind: "table",
      ...(isPositiveInteger(value.rows) ? { rows: value.rows } : {}),
      ...(isPositiveInteger(value.columns) ? { columns: value.columns } : {}),
      ...(isPositiveInteger(value.row) ? { row: value.row } : {}),
      ...(isPositiveInteger(value.column) ? { column: value.column } : {}),
      ...(isPositiveInteger(value.selectedCells) ? { selectedCells: value.selectedCells } : {})
    };
  }
  return { ...shared, kind: value.kind };
}

/** @param value - Candidate object. @returns Whether the value is a plain record. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param value - Candidate target kind. @returns Whether the kind is supported. */
function isStatusKind(value: unknown): value is ClassicEditorStatusTarget["kind"] {
  return value === "caret" || value === "text" || value === "node" || value === "image"
    || value === "table" || value === "control" || value === "story";
}

/** @param value - Candidate mode. @returns Whether product copy owns the mode. */
function isStatusMode(value: unknown): value is ClassicEditorStatusMode {
  return value === "edit" || value === "read-only"
    || value === "template" || value === "fill";
}

/** @param value - Candidate integer. @returns Whether it is non-negative and safe. */
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

/** @param value - Candidate integer. @returns Whether it is positive and safe. */
function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

/**
 * Validates optional positive table facts as one atomic packet.
 *
 * @param values - Optional table dimensions and indices.
 * @returns Whether every present value is a positive safe integer.
 */
function areOptionalPositiveIntegers(...values: readonly unknown[]): boolean {
  return values.every((value) => value === undefined || isPositiveInteger(value));
}
