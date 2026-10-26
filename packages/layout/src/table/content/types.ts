import type { QuireBlockFlowInput } from "../../block-flow";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";

/** Geometry available while resolving recursive content for one table cell. */
export interface QuireTableCellBlockFlowCollectionOptions {
  /** Final content rectangle resolved by table geometry. */
  readonly contentRect: QuireRect;
}

/** Precollected recursive block-flow children for one semantic table cell. */
export interface QuireMeasuredTableCellBlockFlowContent<
  Input extends QuireBlockFlowInput
> {
  /** Child inputs already collected in source order. */
  readonly children: readonly Input[];
  /** Deferred collection is excluded when measured children are authoritative. */
  readonly collectChildren?: never;
}

/** Width-dependent recursive content collected after cell geometry resolves. */
export interface QuireDeferredTableCellBlockFlowContent<
  Input extends QuireBlockFlowInput
> {
  /** Precollected children are excluded when deferred collection is authoritative. */
  readonly children?: never;
  /**
   * Collects child inputs for the resolved cell content rectangle.
   *
   * @param options - Final cell content geometry.
   * @returns Recursive child inputs in source order.
   */
  readonly collectChildren: (
    options: QuireTableCellBlockFlowCollectionOptions
  ) => readonly Input[];
}

/** Exactly one recursive content authority for a semantic table cell. */
export type QuireTableCellBlockFlowContent<
  Input extends QuireBlockFlowInput
> =
  | QuireMeasuredTableCellBlockFlowContent<Input>
  | QuireDeferredTableCellBlockFlowContent<Input>;

/** Consumer-neutral result of measuring recursive table-cell block flow. */
export interface QuireTableCellBlockFlowLayout<
  Input extends QuireBlockFlowInput
> {
  /** Measured content height in CSS pixels. */
  readonly height: number;
  /** Exact child inputs measured inside the cell. */
  readonly children: readonly Input[];
}

/** Canonical container request emitted by table-cell measurement. */
export interface QuireTableCellBlockFlowContainerRequest<
  Input extends QuireBlockFlowInput
> {
  /** Stable measurement container identity. */
  readonly id: string;
  /** Cell content range represented by the container. */
  readonly range: QuireDocumentRange;
  /** Final cell content rectangle in parent coordinates. */
  readonly rect: QuireRect;
  /** Default extent for unmeasured child leaves. */
  readonly blockHeight: number;
  /** Gap between recursive child blocks. */
  readonly blockGap: number;
  /** Child inputs resolved for the final content width. */
  readonly children: readonly Input[];
}

/** Options for measuring recursive block flow inside one table cell. */
export interface MeasureQuireTableCellBlockFlowOptions<
  Input extends QuireBlockFlowInput
> {
  /** Stable semantic cell identity. */
  readonly cellId: string;
  /** Cell content document range. */
  readonly range: QuireDocumentRange;
  /** Final cell content rectangle. */
  readonly contentRect: QuireRect;
  /** Default extent for unmeasured child leaves. */
  readonly blockHeight: number;
  /** Recursive content authority, or undefined for an empty cell. */
  readonly content?: QuireTableCellBlockFlowContent<Input> | undefined;
  /**
   * Lays out the canonical recursive container through the active consumer.
   *
   * @param request - Neutral block-flow container request.
   * @returns Measured container rectangle.
   */
  readonly layoutContainer: (
    request: QuireTableCellBlockFlowContainerRequest<Input>
  ) => { readonly rect: QuireRect };
}
