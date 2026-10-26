import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";
import type { QuirePageGeometry, QuirePaginationCheckpointStore } from "@quirekit/layout/pagination";
import type { QuireLayoutDirtyRange } from "../../../invalidation";
import type { QuireLayoutDocument } from "../types";
import type { QuireMeasuredSourceCacheAdapter } from "./measured-source";

/** Options for deriving page fragments from a block layout document. */
export interface QuireLayoutDocumentPaginationOptions {
  /** Infinite-flow layout document to paginate. */
  readonly document: QuireLayoutDocument;
  /** Page geometry template used for every generated page. */
  readonly pageGeometry: QuirePageGeometry;
  /** Minimum paragraph lines kept together at a page top (widows). Defaults to off (1). */
  readonly widows?: number | undefined;
  /** Minimum paragraph lines kept together at a page bottom (orphans). Defaults to off (1). */
  readonly orphans?: number | undefined;
  /** Whether pages retain source fragments for standalone queries. Defaults to true; false retains projection flow bands only. */
  readonly collectSourceFragments?: boolean | undefined;
  /** Optional cache for box-local measured pagination items. */
  readonly measuredSourceCache?: QuireMeasuredSourceCacheAdapter | undefined;
  /** Optional retained store for page-boundary checkpoint reuse. */
  readonly paginationCheckpointStore?: QuirePaginationCheckpointStore | undefined;
  /** Optional layout dirty range used to resume page driving from the first affected page. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /**
   * Optional document-space clips limiting collected page source context and wrapper projection.
   * Omit when preparing canonical pages for later arbitrary viewport projections.
   */
  readonly projectionClipRects?: readonly QuireRect[] | undefined;
  /** Optional sink receiving pagination subphase timings. */
  readonly trace?: QuireLayoutTraceSink | undefined;
  /** Notes kept on the page or column of the line holding their reference. */
  readonly notes?: readonly QuireLayoutPaginationNote[] | undefined;
  /** Band height above a fragment's first note. */
  readonly noteSeparatorHeight?: number | undefined;
  /** Band height above notes continued from the previous fragment. */
  readonly noteContinuationSeparatorHeight?: number | undefined;
}

/** Measured note attached to the line holding its reference. */
export interface QuireLayoutPaginationNote {
  /** Stable note identity. */
  readonly id: string;
  /** Absolute position of the reference in the body. */
  readonly referencePosition: number;
  /** Measured note body height in CSS pixels. */
  readonly height: number;
  /** Ascending line bottoms where the note may continue on the next fragment. */
  readonly lines?: readonly number[] | undefined;
}

export type { QuirePaginationGeometryKeyOptions } from "@quirekit/layout/pagination";
