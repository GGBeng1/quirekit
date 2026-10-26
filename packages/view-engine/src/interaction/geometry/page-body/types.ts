import type { QuireDocumentRange, QuirePoint, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode, QuireLayoutPage, QuireTableHitTarget } from "../../../layout";
import type { QuireNearestSubLayoutCaretMatch } from "../../sub-layout-query/types";

/** Page-local geometry and explicit repeated-header source exceptions. */
export interface QuirePageBodyCaretScope {
  /** Page body and its accepted source interval. */
  readonly page: QuireLayoutPage;
  /** Repeated cells whose actual rectangles intersect this page body. */
  readonly repeatedTargets: readonly QuireTableHitTarget[];
}

/** A measured line admitted before comparing caret distances. */
export interface QuirePageBodyCaretLine {
  /** Line rectangle clipped to the requested page body. */
  readonly rect: QuireRect;
  /** Source intervals explicitly allowed for this occurrence. */
  readonly ranges: readonly QuireDocumentRange[];
}

/** Comparable geometry shared by raw and provider candidates. */
export interface QuirePageBodyCaretGeometry {
  /** Actual visible line supplying the vertical distance. */
  readonly lineRect: QuireRect;
  /** Shaped caret coordinate supplying the horizontal distance. */
  readonly caretX: number;
}

/** Raw text candidate preserving the existing point-to-caret mapper. */
export interface QuirePageBodyRawCaret extends QuirePageBodyCaretGeometry {
  /** Page-admitted text node passed to the ordinary mapper. */
  readonly node: QuireLayoutNode;
  /** Original or line-projected point accepted by that mapper. */
  readonly point: QuirePoint;
}

/** One winning candidate, resolved to complete hit provenance after scanning. */
export type QuirePageBodyCaretCandidate = QuirePageBodyRawCaret | (
  QuirePageBodyCaretGeometry & {
    /** Exact nested caret and retained products that own it. */
    readonly subLayout: QuireNearestSubLayoutCaretMatch;
  }
);
