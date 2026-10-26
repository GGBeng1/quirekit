import type { CommandProps } from "@quirekit/core";
import { WordTableSelection } from "../../../../selection";

/** Resolves command options from a structural Word table selection. */
export type WordTableSelectionOptionsResolver = (
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
) => Record<string, unknown> | null;

/**
 * Applies a selection-backed option resolver when the current selection is a table selection.
 *
 * @param context - Command execution context.
 * @param options - Explicit command options from the caller.
 * @param resolver - Optional resolver for the current command family.
 * @returns Resolved command options, or null when selection cannot satisfy them.
 */
export function resolveWordTableSelectionOptions(
  context: CommandProps,
  options: Readonly<Record<string, unknown>>,
  resolver?: WordTableSelectionOptionsResolver
): Record<string, unknown> | null {
  if (!resolver) {
    return { ...options };
  }

  const { selection } = context.tr;

  if (!(selection instanceof WordTableSelection)) {
    return { ...options };
  }

  return resolver(options, selection);
}

/**
 * Adds table position and selected grid rect to command options.
 *
 * @param options - Explicit command options from the caller.
 * @param selection - Structural table selection.
 * @returns Options including table position and grid rect.
 */
export function withSelectedTableRect(
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
): Record<string, unknown> {
  return hasGridRect(options)
    ? withSelectedTablePosition(options, selection)
    : {
        ...options,
        tablePos: readTablePos(options, selection),
        startRow: selection.rect.startRow,
        startColumn: selection.rect.startColumn,
        rowSpan: selection.rect.rowSpan,
        columnSpan: selection.rect.columnSpan
      };
}

/**
 * Adds table position and selected row range to command options.
 *
 * @param options - Explicit command options from the caller.
 * @param selection - Structural table selection.
 * @returns Options including table position and selected row range.
 */
export function withSelectedRowRange(
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
): Record<string, unknown> {
  return hasFromRange(options)
    ? withSelectedTablePosition(options, selection)
    : {
        ...options,
        tablePos: readTablePos(options, selection),
        from: selection.rect.startRow,
        to: selection.rect.startRow + selection.rect.rowSpan - 1
      };
}

/**
 * Adds table position and selected column range to command options.
 *
 * @param options - Explicit command options from the caller.
 * @param selection - Structural table selection.
 * @returns Options including table position and selected column range.
 */
export function withSelectedColumnRange(
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
): Record<string, unknown> {
  return hasFromRange(options)
    ? withSelectedTablePosition(options, selection)
    : {
        ...options,
        tablePos: readTablePos(options, selection),
        from: selection.rect.startColumn,
        to: selection.rect.startColumn + selection.rect.columnSpan - 1
      };
}

/**
 * Adds table position and a selected single-cell coordinate to command options.
 *
 * @param options - Explicit command options from the caller.
 * @param selection - Structural table selection.
 * @returns Options including table position and cell coordinate, or null.
 */
export function withSelectedSingleCell(
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
): Record<string, unknown> | null {
  if (hasCellCoordinate(options)) {
    return withSelectedTablePosition(options, selection);
  }

  const cell = selection.cells[0];

  if (!cell || selection.cells.length !== 1) {
    return null;
  }

  return {
    ...options,
    tablePos: readTablePos(options, selection),
    rowIndex: cell.rect.startRow,
    columnIndex: cell.rect.startColumn
  };
}

/**
 * Adds the structural selection table position when the caller omitted it.
 *
 * @param options - Explicit command options from the caller.
 * @param selection - Structural table selection.
 * @returns Options with a table position.
 */
export function withSelectedTablePosition(
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
): Record<string, unknown> {
  return typeof options.tablePos === "number"
    ? { ...options }
    : { ...options, tablePos: selection.tablePos };
}

/**
 * Reads the explicit table position or falls back to the selected table.
 *
 * @param options - Explicit command options from the caller.
 * @param selection - Structural table selection.
 * @returns Absolute table position.
 */
function readTablePos(
  options: Readonly<Record<string, unknown>>,
  selection: WordTableSelection
): number {
  return typeof options.tablePos === "number"
    ? options.tablePos
    : selection.tablePos;
}

/**
 * Checks whether options already include a grid rect.
 *
 * @param options - Options to inspect.
 * @returns Whether all rect coordinates are present.
 */
function hasGridRect(options: Readonly<Record<string, unknown>>): boolean {
  return typeof options.startRow === "number" &&
    typeof options.startColumn === "number" &&
    typeof options.rowSpan === "number" &&
    typeof options.columnSpan === "number";
}

/**
 * Checks whether options already include a range start.
 *
 * @param options - Options to inspect.
 * @returns Whether the range start is present.
 */
function hasFromRange(options: Readonly<Record<string, unknown>>): boolean {
  return typeof options.from === "number";
}

/**
 * Checks whether options already include a cell coordinate.
 *
 * @param options - Options to inspect.
 * @returns Whether the cell coordinate is present.
 */
function hasCellCoordinate(options: Readonly<Record<string, unknown>>): boolean {
  return typeof options.rowIndex === "number" &&
    typeof options.columnIndex === "number";
}
