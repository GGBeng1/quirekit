import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageEndInfo, QuirePageFragment } from "../types";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerAcceptedResult,
  QuireMeasuredContainerPageLeadingBand,
  QuireMeasuredContainerSourceFragment
} from "../container";
import type { QuireAcceptedSourceFlowBand } from "../accepted-source-band";
import type { QuirePageGeometry, QuireResolvedPageGeometry } from "../geometry";
import type { QuirePaginationCheckpointStore } from "../checkpoint";

/** Page context available before the driver paginates one page. */
export interface QuireMeasuredContainerPageSourceContextOptions {
  /** Page index about to be produced. */
  readonly pageIndex: number;
  /** Resolved page geometry for the page index. */
  readonly geometry: QuireResolvedPageGeometry;
}

/** Inputs for driving a measured container across page fragments. */
export interface QuireMeasuredContainerPageDriveOptions {
  /** Measured container to flow across pages. */
  readonly container: QuireMeasuredContainer;
  /** Page geometry template resolved per page index. */
  readonly pageGeometry: QuirePageGeometry;
  /** Band height drawn above a fragment's first note. Defaults to 0. */
  readonly noteSeparatorHeight?: number | undefined;
  /** Band height above notes continued from the previous fragment. Defaults to the separator height. */
  readonly noteContinuationSeparatorHeight?: number | undefined;
  /** Minimum group lines kept together at a page top (widows). Defaults to off (1). */
  readonly widows?: number | undefined;
  /** Minimum group lines kept together at a page bottom (orphans). Defaults to off (1). */
  readonly orphans?: number | undefined;
  /** Resume a paused pass from this continuation; omit to start from the top. */
  readonly resume?: QuireMeasuredContainerDriveContinuation | undefined;
  /**
   * Stop after producing this page index, returning a continuation for the rest.
   * Omit to drive every page in one pass. Enables first-screen-first cascade.
   */
  readonly stopAfterPageIndex?: number | undefined;
  /**
   * Optional page predicate deciding whether accepted source-flow metadata should
   * be collected. Omit to collect on every page, preserving full projection data.
   */
  readonly collectSourceContextForPage?: (
    options: QuireMeasuredContainerPageSourceContextOptions
  ) => boolean;
  /** Whether collected source context includes query fragments. Defaults to true; false retains flow bands only. */
  readonly collectSourceFragments?: boolean | undefined;
  /** Optional dirty range used to reuse page-drive prefix checkpoints. */
  readonly dirtyRange?: QuireDocumentRange | null | undefined;
  /** Stable key covering geometry, widow/orphan policy, and source-context policy. */
  readonly paginationGeometryKey?: string | undefined;
  /** Optional retained checkpoint store used for prefix and converged suffix reuse. */
  readonly paginationCheckpointStore?: QuirePaginationCheckpointStore | undefined;
}

/**
 * The minimal state needed to resume a paused pagination pass and reproduce the
 * remainder of the full pass exactly.
 */
export interface QuireMeasuredContainerDriveContinuation {
  /** Index into the container items of the first item on the next page. */
  readonly startIndex: number;
  /** Page index of the next page to produce. */
  readonly pageIndex: number;
  /** Whether the next page starts at a page top (always true between pages). */
  readonly isPageTop: boolean;
  /** Carried open marks/nodes the next page inherits from the previous page. */
  readonly endInfo: QuirePageEndInfo;
}

/** Result of one drive pass: produced fragments and the resume point, if paused. */
export interface QuireMeasuredContainerDriveResult {
  /** Page fragments produced this pass, in document order. */
  readonly fragments: readonly QuirePageFragment[];
  /** Continuation to resume the rest, or null when the document is complete. */
  readonly continuation: QuireMeasuredContainerDriveContinuation | null;
}

/** Inputs used to create one accepted measured-container page fragment. */
export interface QuireAcceptedPageFragmentOptions {
  /** Measured container being paginated. */
  readonly container: QuireMeasuredContainer;
  /** Page index assigned by the page driver. */
  readonly pageIndex: number;
  /** Resolved page geometry for the page index. */
  readonly geometry: QuireResolvedPageGeometry;
  /** First measured item attempted on this page. */
  readonly startIndex: number;
  /** Accepted pagination result produced by the measured-container routine. */
  readonly result: QuireMeasuredContainerAcceptedResult;
  /** Whether this page should carry source-flow metadata for projection. */
  readonly collectSourceContext?: boolean | undefined;
  /** Whether source context includes query fragments. Defaults to true. */
  readonly collectSourceFragments?: boolean | undefined;
  /** Capability-owned band reserved before the accepted body content. */
  readonly pageLeadingBand: QuireMeasuredContainerPageLeadingBand | null;
}

/** Source-flow metadata collected for one accepted page fragment. */
export interface QuireAcceptedSourceContext {
  /** Accepted source-flow band, or null when accepted items do not carry bands. */
  readonly sourceFlowBand: QuireAcceptedSourceFlowBand | null;
  /** Source fragments contributed by accepted measured items. */
  readonly sourceFragments: readonly QuireMeasuredContainerSourceFragment[];
}
