import { createWordTableMapDiagnostic } from "../diagnostics";
import type { WordTableMapDiagnostic } from "../types";

/**
 * Emits row width diagnostics against a declared grid width.
 *
 * @param rowIndex - Source row index.
 * @param declaredGridWidth - Declared table grid width.
 * @param occupiedGridWidth - Width occupied by this row.
 * @param diagnostics - Mutable diagnostics output.
 */
export function reportRowWidthDiagnostics(
  rowIndex: number,
  declaredGridWidth: number,
  occupiedGridWidth: number,
  diagnostics: WordTableMapDiagnostic[]
): void {
  if (declaredGridWidth <= 0 || occupiedGridWidth === declaredGridWidth) {
    return;
  }

  diagnostics.push(createWordTableMapDiagnostic({
    code: occupiedGridWidth > declaredGridWidth
      ? "row-grid-overflow"
      : "row-grid-underflow",
    message: "Row occupied width does not match the declared table grid.",
    rowIndex,
    range: {
      startColumn: Math.min(occupiedGridWidth, declaredGridWidth),
      columnSpan: Math.abs(occupiedGridWidth - declaredGridWidth)
    }
  }));
}
