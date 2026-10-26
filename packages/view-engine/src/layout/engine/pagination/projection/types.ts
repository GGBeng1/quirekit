import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import type { QuireRetainedRegionProducts } from "../../../region-products";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutDocument } from "../../types";
import type { QuireSourceFlowClip } from "./source-flow";

/** Options used to project paginated layout boxes into page body coordinates. */
export interface QuireLayoutDocumentPageProjectionOptions {
  /** Paginated layout document whose boxes are still in infinite-flow coordinates. */
  readonly document: QuireLayoutDocument;
  /** Horizontal origin of the source flow before the document rect was repaged. */
  readonly sourceFlowX?: number | undefined;
  /** Optional document-space page rects limiting which page-local boxes are projected. */
  readonly projectionClipRects?: readonly QuireRect[] | undefined;
  /** Optional sink receiving page projection subphase timings. */
  readonly trace?: QuireLayoutTraceSink | undefined;
}

/** Renderer-neutral translation between two layout coordinate spaces. */
export interface QuireLayoutTranslation {
  /** Horizontal translation offset. */
  readonly dx: number;
  /** Vertical translation offset. */
  readonly dy: number;
}

/** Translation needed to move one page's flow boxes into its body rectangle. */
export interface QuirePageBodyProjection extends QuireLayoutTranslation {
  /**
   * Page fragment that owns this projection. On a multi-column page it is a
   * column view: range, body rectangle and source-flow band describe one column
   * while `pageIndex` and `pageRect` still name the physical page.
   */
  readonly page: QuirePageFragment;
  /** Column index of a multi-column page projection; absent for single-column pages. */
  readonly columnIndex?: number | undefined;
  /** Physical page body of a column projection; absent when `page.bodyRect` is the body. */
  readonly marginRect?: QuireRect | undefined;
}

/** Inputs used to project one retained sub-layout bundle onto one page. */
export interface ProjectQuireSubLayoutRetainedProductsToPageOptions {
  /** Logical provider and nested products in source-flow coordinates. */
  readonly products: QuireRetainedRegionProducts;
  /** Optional primary region; absent for independently owned products. */
  readonly primaryRegion?: QuireLayoutRegionRef | undefined;
  /** Page-local visible rectangle of the provider primary region. */
  readonly primaryPageRect: QuireRect;
  /** Source-flow interaction clip accepted by this page. */
  readonly sourceClip: QuireRect;
  /** Optional baseline acceptance band, independent of the parent rectangle clip. */
  readonly sourceFlowClip?: QuireSourceFlowClip | undefined;
  /** Translation from source-flow coordinates into page-stack coordinates. */
  readonly translation: QuireLayoutTranslation;
  /** Stable page-local identity of the sub-layout occurrence. */
  readonly visualInstanceId: string;
  /** Retain visible parts of line-owned regions without continuation rebasing. */
  readonly retainPartialText?: boolean | undefined;
}

/** Accepted retained geometry with its independent source-to-page translation. */
export interface QuireRetainedRegionPageGeometry {
  /** Visible page-stack bounds after clipping. */
  readonly rect: QuireRect;
  /** Translation including any line-local flow rebase. */
  readonly translation: QuireLayoutTranslation;
}

/** Aggregated timing buckets for one uncached project-loop pass. */
export interface QuireProjectLoopTimingStats {
  /** Time spent proving whether a box fits one complete page projection. */
  completeOwnershipMs: number;
  /** Time spent translating complete boxes. */
  completeTranslateMs: number;
  /** Time spent splitting straddling leaf boxes. */
  splitLeafMs: number;
  /** Time spent splitting straddling container boxes. */
  splitContainerMs: number;
}
