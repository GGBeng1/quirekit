import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutBox } from "../../../../types";
import type { QuireSourceFlowClip } from "../../source-flow";
import type { QuirePageBodyProjection } from "../../types";

/** Page-local text bucket created by the ordered measured leaf splitter. */
export interface QuireTextLeafPageBucket {
  /** Zero-based page index the bucket belongs to. */
  readonly pageIndex: number;
  /** Projection that moved the bucket into page-local coordinates. */
  readonly projection: QuirePageBodyProjection;
  /** Document range covered by the bucket fragments. */
  readonly range: QuireLayoutBox["range"];
  /** Page-local rectangle covered by the bucket fragments. */
  readonly rect: QuireLayoutBox["rect"];
  /** Projected fragments that belong to the page. */
  readonly fragments: readonly QuireTextFragment[];
}

/** Ordered measured page projection clip. */
export interface QuireOrderedMeasuredProjectionClip {
  /** Page projection that owns the flow clip. */
  readonly projection: QuirePageBodyProjection;
  /** Source-flow vertical clip accepted by the page. */
  readonly clip: QuireSourceFlowClip;
}

/** Mutable builder for one page-local text bucket. */
export interface MutableQuireTextLeafPageBucket {
  /** Zero-based page index the bucket belongs to. */
  pageIndex: number;
  /** Projection that moved the bucket into page-local coordinates. */
  projection: QuirePageBodyProjection;
  /** Inclusive document range start covered by the bucket fragments. */
  rangeFrom: number;
  /** Exclusive document range end covered by the bucket fragments. */
  rangeTo: number;
  /** Minimum page-local x coordinate covered by the bucket fragments. */
  x: number;
  /** Minimum page-local y coordinate covered by the bucket fragments. */
  y: number;
  /** Maximum page-local right edge covered by the bucket fragments. */
  right: number;
  /** Maximum page-local bottom edge covered by the bucket fragments. */
  bottom: number;
  /** Projected fragments that belong to the page. */
  fragments: QuireTextFragment[];
}
