import type { DataBoardView, DataField, DataQuery, DataRecord, DataSet, DataSource } from "../model/types";
import type { DataGroup } from "../query/types";
import type { DataOperation } from "../operations/types";

/** Reference that requires host resolution. */
export type ExternalDataSource = Exclude<DataSource, {kind: "inline"}>;
/** Host-declared access and consistency capabilities. */
export interface DataSourceCapabilities {
  /** Record reads are currently allowed. */
  readonly read: boolean;
  /** Atomic record changes are currently allowed. */
  readonly write: boolean;
  /** Schema changes are currently allowed. */
  readonly schema: boolean;
  /** Groups and counts cover complete query results. */
  readonly groupedQuery: boolean;
  /** A fixed revision can be exported consistently. */
  readonly consistentSnapshot: boolean;
}
/** Source identity and schema from one data revision. */
export interface DataSourceDescription {
  /** Resolved dataset identity. */
  readonly datasetId: string;
  /** Opaque source version. */
  readonly revision: string;
  /** Complete field schema. */
  readonly fields: readonly DataField[];
  /** Record title field. */
  readonly primaryFieldId: string;
  /** Actual supported and permitted operations. */
  readonly capabilities: DataSourceCapabilities;
}
/** Query request scoped to a stable cursor. */
export interface DataSourceQuery {
  /** Complete-data filtering and ordering. */
  readonly query: DataQuery;
  /** Requested field projection; absent returns all fields. */
  readonly fields?: readonly string[];
  /** Maximum records to return. */
  readonly pageSize?: number;
  /** Opaque continuation bound to source, projection and query. */
  readonly cursor?: string;
  /** Required source revision, if supplied. */
  readonly atRevision?: string;
}
/** Explicit projection page, never a complete persisted dataset. */
export interface DataSourcePage {
  /** Source revision. */
  readonly revision: string;
  /** Exactly the fields present in each values object. */
  readonly fields: readonly string[];
  /** Projected records. */
  readonly records: readonly DataRecord[];
  /** Exact count for the complete query. */
  readonly total: number;
  /** Opaque continuation, absent when exhausted. */
  readonly nextCursor: string | null;
}
/** Atomic external write request. */
export interface DataSourceMutation {
  /** Stable retry identity for identical payloads. */
  readonly mutationId: string;
  /** Version originally read by the caller. */
  readonly baseRevision: string;
  /** All-or-nothing changes. */
  readonly operations: readonly DataOperation[];
}
/** Explicit service acknowledgement. */
export type DataSourceReceipt =
  | {readonly status: "applied"; readonly revision: string; readonly mutationId: string}
  | {readonly status: "conflict" | "rejected" | "unknown"; readonly message: string; readonly mutationId: string};
/** Disposable source session; external storage remains authoritative. */
export interface DataSourceSession {
  /** Describes source schema and actual capabilities.
   * @param signal - Cancellation.
   * @returns Detached source facts.
   */
  describe(signal?: AbortSignal): Promise<DataSourceDescription>;
  /** Queries an explicitly projected, versioned page.
   * @param request - Query and projection.
   * @param signal - Cancellation.
   * @returns Versioned page.
   */
  query(request: DataSourceQuery, signal?: AbortSignal): Promise<DataSourcePage>;
  /** Queries complete board groups, if supported.
   * @param view - Board query.
   * @param signal - Cancellation.
   * @returns Complete groups and exact counts.
   */
  queryGroups?(view: DataBoardView, signal?: AbortSignal): Promise<readonly DataGroup[]>;
  /** Applies a conditional atomic mutation, if supported.
   * @param request - Atomic changes and precondition.
   * @param signal - Cancellation.
   * @returns Explicit service receipt.
   */
  mutate?(request: DataSourceMutation, signal?: AbortSignal): Promise<DataSourceReceipt>;
  /** Acquires a complete immutable source at the specified revision.
   * @param atRevision - Required source version.
   * @param signal - Cancellation.
   * @returns Complete immutable snapshot.
   */
  snapshot?(atRevision: string, signal?: AbortSignal): Promise<DataSet>;
  /** Releases this session, including subscriptions and retained data. */
  dispose(): void;
}
/** Host provider; authentication and transport are never document attributes. */
export interface DataSourceProvider {
  /** Resolves a reference into an isolated session.
   * @param source - Stored reference.
   * @param signal - Cancellation.
   * @returns Disposable session.
   */
  open(source: ExternalDataSource, signal?: AbortSignal): Promise<DataSourceSession>;
}
/** Explicit host transport for bounded complete JSON snapshots. */
export type DataSourceJsonLoader = (source: ExternalDataSource, signal?: AbortSignal) => Promise<string>;
