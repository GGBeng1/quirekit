import type { Schema, Node as PMNode } from "@quirekit/pm";
import { createWordTableNode } from "../insert";
import type {
  WordTableMatrix,
  WordTableMatrixLossDiagnostic
} from "./types";

/** Validated source matrix and its temporary unit-cell table. */
export interface PreparedWordTableMatrix {
  /** Temporary unit-cell table carrying validated matrix bodies. */
  readonly tableNode: PMNode;
  /** Source matrix row count. */
  readonly rowCount: number;
  /** Source matrix column count. */
  readonly columnCount: number;
  /** Frozen intake loss codes. */
  readonly lossDiagnostics: readonly WordTableMatrixLossDiagnostic[];
}

/**
 * Validates and materializes one parsed matrix through the existing table builder.
 *
 * @param schema - Owning editor schema.
 * @param matrix - Candidate rectangular cell-content matrix.
 * @param diagnostics - Candidate upstream loss diagnostics.
 * @returns Prepared matrix, or null for invalid shape, content, or diagnostics.
 */
export function prepareWordTableMatrix(
  schema: Schema,
  matrix: WordTableMatrix,
  diagnostics: readonly WordTableMatrixLossDiagnostic[] = []
): PreparedWordTableMatrix | null {
  if (!Array.isArray(matrix) || matrix.length === 0) return null;
  const columnCount = Array.isArray(matrix[0]) ? matrix[0].length : 0;
  if (columnCount === 0 || !areDiagnosticsValid(diagnostics)) return null;

  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== columnCount) return null;
    if (row.some((cell) => !Array.isArray(cell))) return null;
  }

  try {
    const result = createWordTableNode(schema, {
      rowCount: matrix.length,
      columnCount,
      cellContents: matrix.flatMap((row) => row)
    });
    if (!result.ok) return null;

    return {
      tableNode: result.value,
      rowCount: matrix.length,
      columnCount,
      lossDiagnostics: Object.freeze(
        diagnostics.map((diagnostic) => Object.freeze({ code: diagnostic.code }))
      )
    };
  } catch {
    return null;
  }
}

/**
 * Checks upstream loss diagnostic structure.
 *
 * @param diagnostics - Candidate diagnostics.
 * @returns Whether every diagnostic has a non-empty stable code.
 */
function areDiagnosticsValid(
  diagnostics: readonly WordTableMatrixLossDiagnostic[]
): boolean {
  return Array.isArray(diagnostics) && diagnostics.every((diagnostic) =>
    typeof diagnostic === "object"
    && diagnostic !== null
    && typeof diagnostic.code === "string"
    && diagnostic.code.length > 0
  );
}
