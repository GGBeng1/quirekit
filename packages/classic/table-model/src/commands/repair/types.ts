import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableMapDiagnostic } from "../../map";

/** Repair mode used before a table command mutates structure. */
export type WordTableRepairMode = "never" | "safe" | "explicit";

/** Content-preserving choice for a row that exceeds the declared table grid. */
export type WordTableOverflowRepair = "reject" | "expand-grid";

/** Content-preserving choice for a malformed vertical continuation. */
export type WordTableMalformedContinuationRepair = "reject" | "restart" | "clear";

/** Options for the public table repair operation. */
export interface RepairWordTableOptions {
  /** Repair scope. Defaults to safe, non-semantic normalization only. */
  readonly mode?: Exclude<WordTableRepairMode, "never">;
  /** Guarded overflow choice. Omission keeps overflow as a blocking diagnostic. */
  readonly overflow?: WordTableOverflowRepair;
  /** Guarded malformed-continuation choice. Omission keeps it blocking. */
  readonly malformedContinuation?: WordTableMalformedContinuationRepair;
}

/** Stable transaction metadata key carrying a table repair report. */
export const wordTableRepairTransactionMeta = "quirekit:word-table-repair";

/** Stable report produced by one table repair pass. */
export interface WordTableRepairReport {
  /** Repair scope authorized by the caller. */
  readonly mode: Exclude<WordTableRepairMode, "never">;
  /** Diagnostics observed before repair. */
  readonly before: readonly WordTableMapDiagnostic[];
  /** Diagnostics removed by the selected repair policy. */
  readonly applied: readonly WordTableMapDiagnostic[];
  /** Diagnostics that still block ordinary table mutation. */
  readonly remaining: readonly WordTableMapDiagnostic[];
  /** Whether the canonical table node changed. */
  readonly changed: boolean;
}

/** Repaired table and its complete diagnostic report. */
export interface WordTableRepairOutcome {
  /** Canonical table after the selected repair pass. */
  readonly tableNode: PMNode;
  /** Complete before/applied/remaining diagnostic report. */
  readonly report: WordTableRepairReport;
}

/** Prepared table, map, and optional repair evidence for one edit command. */
export interface PreparedWordTableCommand {
  /** Table node that the edit command must consume. */
  readonly tableNode: PMNode;
  /** Repair evidence when preflight changed the table. */
  readonly repair?: WordTableRepairReport;
}
