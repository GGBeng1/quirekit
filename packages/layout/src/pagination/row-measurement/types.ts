import type { QuireDocumentRange } from "@quirekit/renderer";

/** Renderer-neutral row band consumed by measured line slicing. */
export interface QuireMeasuredRowGeometry {
  /** Editable range represented by the complete row. */
  readonly range: QuireDocumentRange;
  /** Inclusive row top in source-flow coordinates. */
  readonly top: number;
  /** Exclusive row bottom in source-flow coordinates. */
  readonly bottom: number;
}

/** Minimal ordered line fact consumed by measured row slicing. */
export interface QuireMeasuredRowLineInput {
  /** Document position at the start of the line. */
  readonly from: number;
  /** Document position at the end of the line. */
  readonly to: number;
  /** Inclusive line top in source-flow coordinates. */
  readonly top: number;
  /** Exclusive line bottom in source-flow coordinates. */
  readonly bottom: number;
}

/** Source-flow band consumed by one measured row line. */
export interface QuireMeasuredRowLineFlowBand {
  /** Inclusive top y coordinate in source-flow space. */
  readonly top: number;
  /** Exclusive bottom y coordinate in source-flow space. */
  readonly bottom: number;
}

/** One non-overlapping measured row slice and its contributing line facts. */
export interface QuireMeasuredRowLineSlice<
  Line extends QuireMeasuredRowLineInput = QuireMeasuredRowLineInput
> {
  /** Editable range represented by the slice. */
  readonly range: QuireDocumentRange;
  /** Source-flow top consumed by the slice. */
  readonly top: number;
  /** Source-flow bottom consumed by the slice. */
  readonly bottom: number;
  /** Ordered line facts merged into this visual row band. */
  readonly lines: readonly Line[];
}
