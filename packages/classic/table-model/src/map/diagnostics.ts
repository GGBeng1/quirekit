import type {
  WordTableGridRange,
  WordTableGridRect,
  WordTableMapDiagnostic,
  WordTableMapDiagnosticCode
} from "./types";

/** Options used to create a map diagnostic. */
export interface CreateWordTableMapDiagnosticOptions {
  /** Stable diagnostic code. */
  readonly code: WordTableMapDiagnosticCode;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Zero-based row index when available. */
  readonly rowIndex?: number | null;
  /** Zero-based cell index when available. */
  readonly cellIndex?: number | null;
  /** Grid range involved in the diagnostic. */
  readonly range?: WordTableGridRange | null;
  /** Grid rect involved in the diagnostic. */
  readonly rect?: WordTableGridRect | null;
  /** Explicit cell ids involved in the diagnostic. */
  readonly explicitCellIds?: readonly string[];
  /** Semantic cell ids involved in the diagnostic. */
  readonly semanticCellIds?: readonly string[];
}

/**
 * Creates a complete `WordTableMapDiagnostic` with normalized optional fields.
 *
 * @param options - Diagnostic options.
 * @returns Complete diagnostic object.
 */
export function createWordTableMapDiagnostic(
  options: CreateWordTableMapDiagnosticOptions
): WordTableMapDiagnostic {
  return {
    code: options.code,
    message: options.message,
    rowIndex: options.rowIndex ?? null,
    cellIndex: options.cellIndex ?? null,
    range: options.range ?? null,
    rect: options.rect ?? null,
    explicitCellIds: options.explicitCellIds ?? [],
    semanticCellIds: options.semanticCellIds ?? []
  };
}
