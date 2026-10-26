import {
  hasMeaningfulContent,
  readPositiveInteger,
  readVerticalMerge
} from "./attrs";
import { createWordTableMapDiagnostic } from "../diagnostics";
import { createExplicitCellId } from "./ids";
import type {
  CreateExplicitCellRefOptions,
  MutableExplicitCellRef
} from "./internal";
import type { WordTableExplicitCellRef } from "../types";

/**
 * Creates an explicit cell ref from a source cell node.
 *
 * @param options - Explicit cell creation inputs.
 * @returns Mutable explicit cell ref.
 */
export function createExplicitCellRef(
  options: CreateExplicitCellRefOptions
): MutableExplicitCellRef {
  const colspan = readPositiveInteger(options.cellNode.attrs.colspan, 1);
  const gridSpan = readPositiveInteger(options.cellNode.attrs.gridSpan, colspan);
  const range = {
    startColumn: options.startColumn,
    columnSpan: gridSpan
  };

  if (gridSpan !== colspan) {
    options.diagnostics.push(createWordTableMapDiagnostic({
      code: "grid-span-colspan-mismatch",
      message: "Cell gridSpan and colspan differ.",
      rowIndex: options.rowIndex,
      cellIndex: options.cellIndex,
      range
    }));
  }

  return {
    id: createExplicitCellId(options.rowIndex, options.cellIndex, range),
    rowId: options.rowId,
    semanticCellId: null,
    role: "origin",
    rowIndex: options.rowIndex,
    cellIndex: options.cellIndex,
    cellPos: options.cellPos,
    range,
    gridSpan,
    vMerge: readVerticalMerge(options.cellNode.attrs.vMerge),
    hasMeaningfulContent: hasMeaningfulContent(options.cellNode)
  };
}

/**
 * Freezes a mutable explicit cell into the public ref shape.
 *
 * @param cell - Mutable explicit cell.
 * @returns Public explicit cell ref.
 */
export function freezeExplicitCell(
  cell: MutableExplicitCellRef
): WordTableExplicitCellRef {
  return { ...cell };
}
