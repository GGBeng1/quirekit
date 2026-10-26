import type { QuireMeasuredContainerNote } from "../container";
import type { QuirePageGeometry } from "../geometry";
import type { QuirePageFragment } from "../types";

/** Inputs for placing notes collected after the end of a paginated flow. */
export interface QuireEndNotePlacementOptions {
  /** Accepted page fragments of the flow, with flow-local page indices. */
  readonly fragments: readonly QuirePageFragment[];
  /** Geometry template that paginated the fragments, reused for appended pages. */
  readonly pageGeometry: QuirePageGeometry;
  /** Note bodies in display order. */
  readonly notes: readonly QuireMeasuredContainerNote[];
  /** Band height before the first end-note area. */
  readonly separatorHeight: number;
  /** Band height before an area that continues end notes. */
  readonly continuationSeparatorHeight: number;
}

/** Vertical space in one page or column available to end notes. */
export interface QuireEndNoteSlot {
  /** Index of the page fragment holding the slot. */
  readonly fragmentIndex: number;
  /** Left edge in document layout coordinates. */
  readonly x: number;
  /** Slot width. */
  readonly width: number;
  /** First y available to end notes. */
  readonly top: number;
  /** Bottom limit, above any page-bottom notes. */
  readonly bottom: number;
  /** Whether the slot starts at its body top, so it must accept something to make progress. */
  readonly atBodyTop: boolean;
}

