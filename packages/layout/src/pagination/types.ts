import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireMeasuredContainerSourceFragment, QuirePageNote } from "./container";
import type { QuireTerminalPlacement } from "./terminal";

/** Notes collected after the end of the flow, placed in one page or column area. */
export interface QuireEndNoteArea {
  /** Area rectangle in document layout coordinates, separator band included. */
  readonly rect: QuireRect;
  /** Note parts in order. */
  readonly notes: readonly QuirePageNote[];
  /** Whether the area continues end notes from an earlier area. */
  readonly continuation: boolean;
}

/** Resume state carried across page cuts. */
export interface QuirePageEndInfo {
  /** Mark names or ids still open at the page cut. */
  readonly openMarks: readonly string[];
  /** Node handle ids still open at the page cut. */
  readonly openNodes: readonly string[];
  /** Capability-owned continuation payload carried into the next page. */
  readonly continuationState?: Readonly<Record<string, unknown>> | undefined;
}

/** Content accepted into one column of a multi-column page. */
export interface QuirePageColumnFragment {
  /** Zero-based column index within the page. */
  readonly columnIndex: number;
  /** Document range covered by this column. */
  readonly range: QuireDocumentRange;
  /** Column rectangle available to page flow. */
  readonly bodyRect: QuireRect;
  /** Rectangle occupied by accepted column content. */
  readonly rect: QuireRect;
  /** Resume state after this column, carrying this column's own leading-band state such as a repeated table header. */
  readonly endInfo?: QuirePageEndInfo | undefined;
  /** Source-flow y coordinate aligned to this column's top. */
  readonly sourceFlowY?: number | undefined;
  /** Source-flow height consumed by this column. */
  readonly sourceFlowHeight?: number | undefined;
  /** Source-flow fragments accepted into this column. */
  readonly sourceFragments?: readonly QuireMeasuredContainerSourceFragment[] | undefined;
  /** Note parts placed at the bottom of this column, in order. */
  readonly notes?: readonly QuirePageNote[] | undefined;
  /** Height of this column's note area, separator included. */
  readonly noteAreaHeight?: number | undefined;
}

/** One renderer-neutral page fragment produced by pagination. */
export interface QuirePageFragment {
  /** Accepted placement of an explicitly constrained terminal section, when present. */
  readonly terminalPlacement?: QuireTerminalPlacement | undefined;
  /** Zero-based page index. */
  readonly pageIndex: number;
  /** Document range covered by this page fragment. */
  readonly range: QuireDocumentRange;
  /** Full page rectangle in document layout coordinates. */
  readonly pageRect: QuireRect;
  /** Body rectangle available to page flow. */
  readonly bodyRect: QuireRect;
  /** Rectangle occupied by accepted body content. */
  readonly rect: QuireRect;
  /** Source-flow y coordinate aligned to this page fragment's body content. */
  readonly sourceFlowY?: number | undefined;
  /** Source-flow height consumed by this page fragment before projection. */
  readonly sourceFlowHeight?: number | undefined;
  /** Source-flow fragments accepted before consumer-specific projection. */
  readonly sourceFragments?: readonly QuireMeasuredContainerSourceFragment[] | undefined;
  /** Resume state at the end of this fragment. */
  readonly endInfo: QuirePageEndInfo;
  /**
   * Columns filled on a multi-column page, in flow order. Page-level range and
   * source-flow band are the union of these columns.
   */
  readonly columns?: readonly QuirePageColumnFragment[] | undefined;
  /** Zero-width separator lines drawn before each non-empty column after the first. */
  readonly columnSeparators?: readonly QuireRect[] | undefined;
  /** Note parts placed at the bottom of this single-column page, in order. */
  readonly notes?: readonly QuirePageNote[] | undefined;
  /** Height of the page's note area, separator included. */
  readonly noteAreaHeight?: number | undefined;
  /**
   * Bottom edge of the note areas when they sit at the page bottom below a
   * balanced column band; absent when notes end at their column or page body.
   */
  readonly noteAreaBottom?: number | undefined;
  /** Filled note separator rules, one per page or column note area. */
  readonly noteSeparators?: readonly QuireRect[] | undefined;
  /** End-note areas after the flow end, in flow order. */
  readonly endNoteAreas?: readonly QuireEndNoteArea[] | undefined;
  /** Document ranges of the note parts shown on this page, outside the body range. */
  readonly noteRanges?: readonly QuireDocumentRange[] | undefined;
}
