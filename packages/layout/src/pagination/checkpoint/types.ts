import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageEndInfo, QuirePageFragment } from "../types";
import type { QuireMeasuredContainer } from "../container";

/** Stable measured-item facts captured at a pagination boundary. */
export interface QuirePaginationItemAnchor {
  /** Item index in the measured container that produced the checkpoint. */
  readonly index: number;
  /** Stable measured-item identity. */
  readonly id: string;
  /** Editable range start represented by the item. */
  readonly rangeFrom: number;
  /** Editable range end represented by the item. */
  readonly rangeTo: number;
  /** Source-flow top when the item participates in source-flow projection. */
  readonly flowTop?: number | undefined;
  /** Source-flow bottom when the item participates in source-flow projection. */
  readonly flowBottom?: number | undefined;
  /** Measured item height. */
  readonly height: number;
}

/** Renderer-neutral state required to resume pagination at one page boundary. */
export interface QuirePaginationCheckpoint {
  /** First measured item to consider on the next page. */
  readonly nextItem: QuirePaginationItemAnchor;
  /** Page index that should be produced next. */
  readonly pageIndex: number;
  /** Whether the next fragment begins at a fresh page top. */
  readonly isPageTop: boolean;
  /** Open mark identities carried across the page boundary. */
  readonly openMarks: readonly string[];
  /** Open node identities carried across the page boundary. */
  readonly openNodes: readonly string[];
  /** Capability-owned continuation payload carried across the page boundary. */
  readonly continuationState?: QuirePageEndInfo["continuationState"] | undefined;
  /** Geometry and pagination-policy key that produced this checkpoint. */
  readonly geometryKey: string;
}

/** One retained page plus its incoming and outgoing pagination checkpoints. */
export interface QuirePaginationPageRecord {
  /** Page fragment produced by the previous pagination pass. */
  readonly fragment: QuirePageFragment;
  /** Checkpoint at the beginning of this page. */
  readonly start: QuirePaginationCheckpoint;
  /** Checkpoint after this page, or null when this is the terminal page. */
  readonly end: QuirePaginationCheckpoint | null;
  /** Last measured item accepted by this page. */
  readonly endItem?: QuirePaginationItemAnchor | undefined;
}

/** Retained stream state returned before an incremental pagination pass. */
export interface QuirePaginationCheckpointReusePlan {
  /** Unchanged page prefix that can be reused without pagination. */
  readonly prefix: readonly QuirePaginationPageRecord[];
  /** Checkpoint from which the page driver resumes, when a prefix was reused. */
  readonly resume?: QuirePaginationCheckpoint | undefined;
  /** Complete previous page stream used for downstream convergence. */
  readonly previous: readonly QuirePaginationPageRecord[];
  /** First page index that must be recomputed. */
  readonly firstAffectedPageIndex: number;
}

/** Options used to read the previous pagination checkpoint stream. */
export interface QuirePaginationCheckpointStoreReadOptions {
  /** Current measured container. */
  readonly container: QuireMeasuredContainer;
  /** Dirty editable range that invalidates the first intersecting page. */
  readonly dirtyRange: QuireDocumentRange;
  /** Geometry and pagination-policy key for the current pass. */
  readonly geometryKey: string;
}

/** Options used to commit a completed pagination checkpoint stream. */
export interface QuirePaginationCheckpointStoreWriteOptions {
  /** Current measured container that produced the stream. */
  readonly container: QuireMeasuredContainer;
  /** Geometry and pagination-policy key for the completed pass. */
  readonly geometryKey: string;
  /** Complete page stream in page order. */
  readonly records: readonly QuirePaginationPageRecord[];
  /** Number of pages recomputed by the page driver in this pass. */
  readonly recomputedPages: number;
  /** Number of retained suffix pages appended after convergence. */
  readonly suffixPagesReused: number;
  /** Whether the pass had a previous stream against which convergence was attempted. */
  readonly convergenceAttempted: boolean;
}

/** Internal retained store for one previous pagination checkpoint stream. */
export interface QuirePaginationCheckpointStore {
  /**
   * Reads the previous stream and its unchanged prefix.
   *
   * @param options - Current measured container, dirty range, and geometry key.
   * @returns Reuse plan, or null when no compatible previous stream exists.
   */
  read(
    options: QuirePaginationCheckpointStoreReadOptions
  ): QuirePaginationCheckpointReusePlan | null;
  /**
   * Commits one completed page stream.
   *
   * @param options - Current measured container, geometry key, and records.
   * @returns Nothing.
   */
  write(options: QuirePaginationCheckpointStoreWriteOptions): void;
}

/** Uniform translation proven when a new checkpoint converges with an old one. */
export interface QuirePaginationCheckpointDelta {
  /** Difference between current and retained measured-item indexes. */
  readonly itemIndex: number;
  /** Difference between current and retained document positions. */
  readonly range: number;
  /** Difference between current and retained source-flow coordinates. */
  readonly flow: number;
}

/** Reusable retained suffix produced by checkpoint convergence. */
export interface QuirePaginationCheckpointConvergence {
  /** Uniform translation applied to the retained suffix. */
  readonly delta: QuirePaginationCheckpointDelta;
  /** Translated suffix records ready to append to the current stream. */
  readonly suffix: readonly QuirePaginationPageRecord[];
}
