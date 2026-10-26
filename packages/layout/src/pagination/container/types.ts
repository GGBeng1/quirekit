import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageEndInfo } from "../types";

/**
 * Forced break requested by a measured container item after it is accepted.
 * Both kinds end the current pagination fragment; a column break only ends the
 * page when no later column remains.
 */
export type QuireMeasuredContainerBreakAfter = "page" | "column";

/** Forced break requested by a measured container item before it is accepted. */
export type QuireMeasuredContainerBreakBefore = "page";

/** Kind of source fragment that contributed to one measured container item. */
export type QuireMeasuredContainerSourceFragmentKind =
  | "textLine"
  | "tableCellLine";

/** Grid rectangle metadata for table-like measured source fragments. */
export interface QuireMeasuredContainerSourceGridRect {
  /** Zero-based start row in the source table grid. */
  readonly startRow: number;
  /** Zero-based start column in the source table grid. */
  readonly startColumn: number;
  /** Number of grid rows covered by the source fragment owner. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the source fragment owner. */
  readonly columnSpan: number;
}

/** Source-flow fragment that contributed to one measured container item. */
export interface QuireMeasuredContainerSourceFragment {
  /** Fragment family used by diagnostics and future recursive child pagination. */
  readonly kind: QuireMeasuredContainerSourceFragmentKind;
  /** Layout or semantic owner that emitted this fragment. */
  readonly ownerId: string;
  /** Optional stable semantic owner when it differs from the layout owner. */
  readonly semanticOwnerId?: string | undefined;
  /** Optional original source owner represented by a continuation fragment. */
  readonly originOwnerId?: string | undefined;
  /** Optional explicit source owners represented by a merged or continued fragment. */
  readonly explicitOwnerIds?: readonly string[] | undefined;
  /** Optional source document position for the origin owner. */
  readonly originOwnerPos?: number | undefined;
  /** Optional table grid rectangle represented by the source owner. */
  readonly gridRect?: QuireMeasuredContainerSourceGridRect | undefined;
  /** Editable source range represented by the fragment itself. */
  readonly range: QuireDocumentRange;
  /** Source-flow y coordinate where the contributing fragment starts. */
  readonly flowTop: number;
  /** Source-flow y coordinate where the contributing fragment ends. */
  readonly flowBottom: number;
}

/** Capability-owned band reserved before body content on a continuation page. */
export interface QuireMeasuredContainerPageLeadingBand {
  /** Stable identity of the capability-owned band. */
  readonly id: string;
  /** Vertical space reserved by the band in CSS pixels. */
  readonly height: number;
  /** Explicit capability state projected onto the accepted page fragment. */
  readonly continuationState: Readonly<Record<string, unknown>>;
}

/** One note whose body is placed at the bottom of the fragment holding its reference. */
export interface QuireMeasuredContainerNote {
  /** Stable note identity. */
  readonly id: string;
  /** Measured note body height in CSS pixels. */
  readonly height: number;
  /** Ascending line bottoms inside the note body where it may continue on the next fragment. */
  readonly lines?: readonly number[] | undefined;
}

/** Part of one note body placed on a fragment. */
export interface QuirePageNote {
  /** Stable note identity. */
  readonly id: string;
  /** Offset into the note body where this part starts. */
  readonly offset: number;
  /** Height of this part. */
  readonly height: number;
  /** Whether this part continues a note begun on an earlier fragment. */
  readonly continuation: boolean;
}

/** Measured container input consumed by the generic pagination contract. */
export interface QuireMeasuredContainer {
  /** Stable container id within the measured layout tree. */
  readonly id: string;
  /** Document range covered by the container. */
  readonly range: QuireDocumentRange;
  /** Ordered measured items owned by the container. */
  readonly items: readonly QuireMeasuredContainerItem[];
}

/** One measured item inside a paginable container. */
export interface QuireMeasuredContainerItem {
  /** Stable item id within the measured container. */
  readonly id: string;
  /** Document range covered by this item. */
  readonly range: QuireDocumentRange;
  /** Source-flow y coordinate where this item starts before pagination. */
  readonly flowTop?: number | undefined;
  /** Source-flow y coordinate where this item ends before pagination. */
  readonly flowBottom?: number | undefined;
  /** Measured item height in CSS pixels. */
  readonly height: number;
  /**
   * Flow-space gap above this item (e.g. a block's top margin). Counted toward
   * page height only when the item is not the first accepted on its page, so a
   * gap at a page break collapses — matching mature flow layout. Defaults to 0.
   */
  readonly gapBefore?: number | undefined;
  /**
   * Group id (e.g. paragraph id) shared by the items of one splittable block.
   * Contiguous items with the same group are subject to widow/orphan control when
   * the group spans a page break. Undefined items are standalone.
   */
  readonly group?: string | undefined;
  /** Whether the complete contiguous group should move together when possible. */
  readonly keepTogether?: boolean | undefined;
  /** Whether the contiguous group should remain with its successor's first item. */
  readonly keepWithNext?: boolean | undefined;
  /** Group-local widow minimum overriding the container default. */
  readonly groupWidows?: number | undefined;
  /** Group-local orphan minimum overriding the container default. */
  readonly groupOrphans?: number | undefined;
  /** Whether future sub-item logic may split this item across pages. */
  readonly canSplit?: boolean | undefined;
  /** Optional forced break that the parent page driver should honor before this item. */
  readonly breakBefore?: QuireMeasuredContainerBreakBefore | undefined;
  /** Optional forced break that the parent page driver should honor after this item. */
  readonly breakAfter?: QuireMeasuredContainerBreakAfter | undefined;
  /** Resume state at the end of this item. */
  readonly endInfo?: QuirePageEndInfo | undefined;
  /** Optional capability-owned band reserved before this item on a continuation page. */
  readonly pageLeadingBand?: QuireMeasuredContainerPageLeadingBand | undefined;
  /** Notes referenced by this item, which must share its page or column. */
  readonly notes?: readonly QuireMeasuredContainerNote[] | undefined;
  /** Source-flow fragments that contributed to this measured item. */
  readonly sourceFragments?: readonly QuireMeasuredContainerSourceFragment[] | undefined;
}

/** Options accepted by measured-container pagination. */
export interface QuireMeasuredContainerPaginationOptions {
  /** Container whose measured items should be paginated. */
  readonly container: QuireMeasuredContainer;
  /** Item index where pagination should resume. */
  readonly startIndex: number;
  /** Available height in CSS pixels for this page fragment. */
  readonly availableHeight: number;
  /** Whether this fragment begins at the top of a fresh page. */
  readonly isPageTop: boolean;
  /** Resume state carried into this container fragment. */
  readonly incomingEndInfo: QuirePageEndInfo;
  /**
   * Whether accepted results should carry source-flow context collected during
   * the pagination scan.
   */
  readonly collectSourceContext?: boolean | undefined;
  /** Whether collected context includes query fragments. Defaults to true; false retains flow bands only. */
  readonly collectSourceFragments?: boolean | undefined;
  /** Height of the band drawn above the first note of a fragment. Defaults to 0. */
  readonly noteSeparatorHeight?: number | undefined;
  /** Height of the band above notes continued from the previous fragment. Defaults to the separator height. */
  readonly noteContinuationSeparatorHeight?: number | undefined;
  /** Whether notes are placed below the flow by the caller instead of consuming fragment height. */
  readonly notesBelowFlow?: boolean | undefined;
  /** Minimum group lines to keep together at a page top (widows). Defaults to 1. */
  readonly widows?: number | undefined;
  /** Minimum group lines to keep together at a page bottom (orphans). Defaults to 1. */
  readonly orphans?: number | undefined;
}

/** Shared payload for measured-container results that accept content. */
export interface QuireMeasuredContainerAcceptedResult {
  /** Document range accepted by this result. */
  readonly range: QuireDocumentRange;
  /** Height consumed by the accepted measured items. */
  readonly consumedHeight: number;
  /** Item index where the caller should resume. */
  readonly nextIndex: number;
  /** Resume state at the end of the accepted fragment. */
  readonly endInfo: QuirePageEndInfo;
  /** Source-flow top accepted by this result when collection was requested. */
  readonly sourceFlowTop?: number | undefined;
  /** Source-flow bottom accepted by this result when collection was requested. */
  readonly sourceFlowBottom?: number | undefined;
  /** Source-flow fragments accepted by this result when collection was requested. */
  readonly sourceFragments?: readonly QuireMeasuredContainerSourceFragment[] | undefined;
  /** Note parts placed at the bottom of this fragment. */
  readonly notes?: readonly QuirePageNote[] | undefined;
  /** Note area height, separator included. */
  readonly noteAreaHeight?: number | undefined;
}

/** Result returned when the container finishes within the available height. */
export interface QuireMeasuredContainerDoneResult
  extends QuireMeasuredContainerAcceptedResult {
  /** Discriminator for a fully consumed container. */
  readonly kind: "done";
}

/** Result returned when the page fills before the container is exhausted. */
export interface QuireMeasuredContainerSpillResult
  extends QuireMeasuredContainerAcceptedResult {
  /** Discriminator for a page-spanning container fragment. */
  readonly kind: "spill";
}

/** Result returned for an oversized indivisible item already at page top. */
export interface QuireMeasuredContainerPlaceAndOverflowResult
  extends QuireMeasuredContainerAcceptedResult {
  /** Discriminator for page-top overflow placement. */
  readonly kind: "place-and-overflow";
}

/** Result returned when a previous page must be rebuilt. */
export interface QuireMeasuredContainerBacktrackResult {
  /** Discriminator for a future widow/orphan backtrack request. */
  readonly kind: "backtrack";
  /** Number of already placed items the parent should pull forward. */
  readonly pull: number;
}

/** Result of paginating a measured container fragment. */
export type QuireMeasuredContainerPaginationResult =
  | QuireMeasuredContainerDoneResult
  | QuireMeasuredContainerSpillResult
  | QuireMeasuredContainerPlaceAndOverflowResult
  | QuireMeasuredContainerBacktrackResult;

/** Mutable source-flow context collected while accepting measured items. */
export interface QuireMeasuredContainerSourceContextBuilder {
  /** Smallest accepted source-flow y coordinate. */
  sourceFlowTop: number;
  /** Largest accepted source-flow y coordinate. */
  sourceFlowBottom: number;
  /** Accepted query fragments, or null when only flow bands are requested. */
  sourceFragments: QuireMeasuredContainerSourceFragment[] | null;
}
