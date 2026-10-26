import type { QuireMountedTableSizing } from "@quirekit/core";

/** Backend-neutral retained source sizing consumed only during a command. */
export type WordTableMeasuredSizing = QuireMountedTableSizing;

/** Validated inclusive distribution range. */
export interface WordTableDistributionRange {
  /** First logical source index. */
  readonly from: number;
  /** Last logical source index. */
  readonly to: number;
}
