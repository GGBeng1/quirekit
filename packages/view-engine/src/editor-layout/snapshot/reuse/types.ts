import type { QuireLayoutAuthoritySnapshot } from "@quirekit/core";
import type { QuireLayoutSnapshotAdapterOptions } from "../../types";
import type { QuireLayoutSnapshotOptions, QuireRetainedLayoutSnapshot } from "../../types";
import type { QuireLayoutPage } from "../../../layout/types";

/** One offscreen query window of at most two pages, owned by an immutable snapshot. */
export interface QuirePositionLayoutProjection {
  /** First physical page containing the queried source boundary. */
  readonly firstPage: QuireLayoutPage;
  /** Last containing page, equal to firstPage for positions inside a page. */
  readonly lastPage: QuireLayoutPage;
  /** Query-only geometry that never replaces the mounted viewport tree. */
  readonly snapshot: QuireRetainedLayoutSnapshot;
}

/** Completed geometry authority retained before state-sensitive adaptation. */
export type QuireLayoutProduct = Pick<QuireLayoutSnapshotAdapterOptions,
  "document" | "viewGraphOptions" | "selectionStructureIndex"
> & {
  /** Complete unprojected body geometry, including measured offscreen text. */
  readonly sourceDocument: QuireLayoutSnapshotAdapterOptions["document"];
  /** Captured value signature of the currently projected window. */
  readonly projectionSignature: string;
  /** Projects retained source geometry for a new window without collecting or paginating. */
  readonly projectDocument: (
    /** Current clipping and trace inputs; canonical layout values are already proven. */
    options: QuireLayoutSnapshotOptions
  ) => QuireLayoutSnapshotAdapterOptions["document"];
};

/** Actual layout work accumulated in one accepted or transient cache lane. */
export interface QuireLayoutProductCounters {
  /** Full canonical layout compilations attempted by this lane. */
  readonly rebuilt: number;
  /** Frames adapted from a previously accepted canonical layout. */
  readonly reused: number;
  /** Last admission failure, or null when the current frame reused layout. */
  readonly fallbackReason: string | null;
}

/** Private current-generation authority for one retained block graph. */
export interface QuireLayoutProductCache {
  /** Monotonic invocation generation, including reentrant attempts. */
  generation: number;
  /** Last candidate confirmed after complete frame construction. */
  accepted?: QuireLayoutProductCandidate;
  /** Actual cumulative layout work and last admission decision. */
  counters: QuireLayoutProductCounters;
}

/** Captured inputs and products belonging to one complete layout attempt. */
export interface QuireLayoutProductCandidate {
  /** Lane whose latest generation may publish this candidate. */
  readonly cache: QuireLayoutProductCache;
  /** Invocation generation captured before dependency callbacks execute. */
  readonly generation: number;
  /** Exact state and configuration used to compile or reuse the product. */
  readonly options: QuireLayoutSnapshotOptions;
  /** Fresh callback/version proof with an owned token array. */
  readonly authority: QuireLayoutAuthoritySnapshot;
  /** Serialized bounded value inputs, captured before external work executes. */
  readonly signature: string;
  /** Exact measurer, version, policy and schema identities. */
  readonly identities: readonly unknown[];
  /** Geometry to retain after successful frame construction. */
  readonly product: QuireLayoutProduct;
  /** Adapted current-state geometry used for directional head admission. */
  readonly snapshot: QuireRetainedLayoutSnapshot;
  /** Whether any framework or provider drawing-text region needs current-state adaptation. */
  readonly selectionSensitive: boolean;
}

/** Inputs captured before a canonical layout build or reuse begins. */
export type QuireLayoutProductAttempt = Omit<QuireLayoutProductCandidate, "product" | "snapshot" | "selectionSensitive"> & {
  /** Previously accepted geometry when every dependency was proven stable. */
  readonly reusedProduct?: QuireLayoutProduct | undefined;
};
