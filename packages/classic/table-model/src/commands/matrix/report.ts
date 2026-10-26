import { createWordTableMap } from "../../map";
import type { Node as PMNode } from "@quirekit/pm";
import type { PreparedWordTableMatrix } from "./source";
import type {
  WordTableMatrixPasteReport,
  WordTableMatrixPasteStrategy
} from "./types";

/** Transaction meta carrying the exact matrix result and intake losses. */
export const wordTableMatrixPasteTransactionMeta =
  "quirekit:word-table-matrix-paste";

/**
 * Creates the typed receipt attached to a successful matrix transaction.
 *
 * @param strategy - Committed paste strategy.
 * @param source - Validated source matrix.
 * @param previousTable - Previous target table, or null for insertion.
 * @param resultTable - Resulting logical table.
 * @returns Frozen matrix paste receipt.
 */
export function createWordTableMatrixPasteReport(
  strategy: WordTableMatrixPasteStrategy,
  source: PreparedWordTableMatrix,
  previousTable: PMNode | null,
  resultTable: PMNode
): WordTableMatrixPasteReport {
  const previousMap = previousTable === null
    ? null
    : createWordTableMap(previousTable);
  const resultMap = createWordTableMap(resultTable);

  return Object.freeze({
    strategy,
    sourceRowCount: source.rowCount,
    sourceColumnCount: source.columnCount,
    resultRowCount: resultMap.height,
    resultColumnCount: resultMap.width,
    addedRowCount: resultMap.height - (previousMap?.height ?? 0),
    addedColumnCount: resultMap.width - (previousMap?.width ?? 0),
    lossDiagnostics: source.lossDiagnostics
  });
}
