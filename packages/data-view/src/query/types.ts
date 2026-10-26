import type { DataRecord } from "../model/types";

/** Requested window after complete-data filtering and ordering. */
export interface DataPageOptions {
  /** Transient literal search across displayed values, applied before grouping, statistics and paging. */
  readonly search?: string;
  /** Zero-based offset in the complete query result. */
  readonly offset?: number;
  /** Maximum records, defaulting to all local results. */
  readonly limit?: number;
}
/** Page whose total describes the entire matching result. */
export interface DataPage {
  /** Source revision, identical for every item in this result. */
  readonly revision: string;
  /** Detached complete records in this window. */
  readonly records: readonly DataRecord[];
  /** Exact complete-query count. */
  readonly total: number;
  /** Next offset, or null when the result is exhausted. */
  readonly nextOffset: number | null;
}
/** Table result whose aggregates cover the complete filtered result. */
export interface DataTablePage extends DataPage {
  /** Field aggregates; null denotes an empty average or non-finite arithmetic. */
  readonly summaries: Readonly<Record<string, number | null>>;
}
/** A board column with complete counts and a bounded row window. */
export interface DataGroup extends DataPage {
  /** Stable option identity, or null for unassigned records. */
  readonly key: string | null;
  /** Current option label. */
  readonly label: string;
}
