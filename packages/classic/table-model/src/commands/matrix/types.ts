import type {
  QuireCommandPosition,
  QuireJSONContent
} from "@quirekit/core";
import type {
  WordTableCommandRepairOptions,
  WordTableEditorLocateOptions
} from "../types";

/** Canonical block content carried by one parsed matrix cell. */
export type WordTableMatrixCellContent = readonly QuireJSONContent[];

/** Rectangular row-major matrix accepted from a classified paste intake. */
export type WordTableMatrix = readonly (
  readonly WordTableMatrixCellContent[]
)[];

/** Explicit paste strategies admitted by the frozen Table contract. */
export type WordTableMatrixPasteStrategy = "fill" | "expand" | "insert";

/** Loss already identified by the upstream intake classifier. */
export interface WordTableMatrixLossDiagnostic {
  /** Stable machine-readable loss code. */
  readonly code: string;
}

/** Options shared by every matrix paste strategy. */
export interface WordTableMatrixPasteBaseOptions {
  /** Rectangular parsed cell-content matrix. */
  readonly matrix: WordTableMatrix;
  /** Losses identified while converting the source into this matrix. */
  readonly lossDiagnostics?: readonly WordTableMatrixLossDiagnostic[];
}

/** Options that target an existing logical Word table. */
export interface PasteWordTableMatrixIntoTableOptions
  extends WordTableMatrixPasteBaseOptions, WordTableCommandRepairOptions {
  /** Existing-table strategy: reject overflow or expand bottom/right. */
  readonly strategy: "fill" | "expand";
  /** First target table row. */
  readonly startRow: number;
  /** First target table grid column. */
  readonly startColumn: number;
}

/** Options that insert the matrix as a new logical Word table. */
export interface InsertWordTableMatrixOptions
  extends WordTableMatrixPasteBaseOptions {
  /** New-table insertion strategy. */
  readonly strategy: "insert";
  /** Optional editor position or range receiving the new table. */
  readonly position?: QuireCommandPosition;
}

/** Editor options targeting one existing logical Word table. */
export interface PasteWordTableMatrixIntoTableCommandOptions
  extends PasteWordTableMatrixIntoTableOptions, WordTableEditorLocateOptions {}

/** Complete editor-facing matrix paste options. */
export type PasteWordTableMatrixCommandOptions =
  | PasteWordTableMatrixIntoTableCommandOptions
  | InsertWordTableMatrixOptions;

/** Typed transaction receipt for one successful matrix paste. */
export interface WordTableMatrixPasteReport {
  /** Strategy committed by the command. */
  readonly strategy: WordTableMatrixPasteStrategy;
  /** Row count in the parsed source matrix. */
  readonly sourceRowCount: number;
  /** Column count in the parsed source matrix. */
  readonly sourceColumnCount: number;
  /** Row count in the resulting logical table. */
  readonly resultRowCount: number;
  /** Grid-column count in the resulting logical table. */
  readonly resultColumnCount: number;
  /** Rows added while expanding or inserting. */
  readonly addedRowCount: number;
  /** Grid columns added while expanding or inserting. */
  readonly addedColumnCount: number;
  /** Intake losses committed with this result. */
  readonly lossDiagnostics: readonly WordTableMatrixLossDiagnostic[];
}
