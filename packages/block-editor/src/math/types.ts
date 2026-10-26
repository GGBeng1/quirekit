import type { Node } from "@quirekit/pm";
import type { BlockSlotRef } from "@quirekit/extensions";

/** Canonical positions captured before a formula authoring dialog takes focus. */
export interface BlockMathRange {
  /** Inclusive start boundary. */
  readonly from: number;
  /** Exclusive end boundary; equal to from for insertion. */
  readonly to: number;
}

/** Formula insertion at a current selection or an explicitly captured destination. */
export interface BlockMathInsert {
  /** Exact LaTeX accepted by the shared authoring core. */
  readonly latex: string;
  /** True creates a standalone block; otherwise an inline atom. */
  readonly display?: boolean;
  /** Captured text or slash range; omitted for the current selection. */
  readonly position?: BlockMathRange;
  /** Immutable document guard for asynchronous authoring. */
  readonly expectedDocument?: Node;
  /** Captured gutter slot; inline formulas receive their own paragraph. */
  readonly destination?: BlockSlotRef;
}

/** Update of one formula whose source identity is still current. */
export interface BlockMathChange {
  /** Formula node boundary. */
  readonly position: number;
  /** Original canonical node. */
  readonly expected: Node;
  /** Optional whole-document guard for a modal authoring session. */
  readonly expectedDocument?: Node;
  /** Complete new source. */
  readonly latex: string;
}

/** Immutable source lease for one explicit formula editing task. */
export interface BlockMathRequest {
  /** Original document, independent of later focus or selection. */
  readonly doc: Node;
  /** Initial source, which may need repair after importing an unknown grammar. */
  readonly latex: string;
  /** Formula placement in the document. */
  readonly display: boolean;
  /** Retained insertion selection or exact existing atom range. */
  readonly range: BlockMathRange;
  /** Present only for editing an existing formula. */
  readonly node?: Node;
  /** Present only for insertion beside a captured block. */
  readonly destination?: BlockSlotRef;
}

/** Explicit entry point options shared by the gutter, slash, toolbar and atom. */
export interface BlockMathOpenOptions {
  /** An existing formula boundary; absent means insertion. */
  readonly position?: number;
  /** Replacement range for a slash trigger. */
  readonly range?: BlockMathRange;
  /** Destination beside a captured block. */
  readonly destination?: BlockSlotRef;
}
