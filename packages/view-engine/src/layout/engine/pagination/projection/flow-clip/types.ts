import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../../types";
import type { QuireSourceFlowClip } from "../source-flow";
import type { QuirePageBodyProjection } from "../types";

/** Source metadata and accepted geometry for a clipped layout box. */
export interface ProjectedQuireFlowClipBoxOptions {
  /** Source box in infinite-flow document coordinates. */
  readonly box: QuireLayoutBox;
  /** Projected box identity, distinct from the logical source. */
  readonly id: string;
  /** Accepted editable document range. */
  readonly range: QuireLayoutBox["range"];
  /** Accepted box bounds in page-stack coordinates. */
  readonly rect: QuireRect;
  /** Source-to-page translation and page identity. */
  readonly projection: QuirePageBodyProjection;
  /** Vertical band accepted by the parent flow. */
  readonly flowClip: QuireSourceFlowClip;
  /** Keep partially visible line-owned products in fixed overflow frames. */
  readonly retainPartialText?: boolean | undefined;
  /** Optional parent rectangle; owns clipping outside the paragraph text bounds. */
  readonly rectClip?: QuireRect | undefined;
}

/** Options for projecting a nested layout box through a source-flow clip. */
export interface QuireFlowClipLayoutBoxProjectionOptions {
  /** Source layout box in flow coordinates. */
  readonly box: QuireLayoutBox;
  /** Page-body projection that moves retained geometry into page coordinates. */
  readonly projection: QuirePageBodyProjection;
  /** Source-flow vertical band accepted by the parent fragment. */
  readonly flowClip: QuireSourceFlowClip;
  /** Optional parent visible rectangle in source-flow coordinates. */
  readonly rectClip?: QuireRect | undefined;
  /** Retain partially visible text without rebasing when content overflows a fixed frame. */
  readonly retainPartialText?: boolean | undefined;
  /** Optional replacement id for the projected root box. */
  readonly id?: string | undefined;
  /** Stable id suffix applied to projected descendants. */
  readonly suffix: string;
}
