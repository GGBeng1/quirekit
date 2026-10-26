import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableFloatingPlacement } from "../types";

/** Input used to resolve one floating table's page-projected visual position. */
export interface QuireTableFloatingPositionInput {
  /** Canonical floating placement source. */
  readonly placement: QuireTableFloatingPlacement;
  /** Physical page reference rectangle. */
  readonly pageRect: QuireRect;
  /** Page margin/body reference rectangle. */
  readonly marginRect: QuireRect;
  /** Projected logical text-anchor reference rectangle. */
  readonly textRect: QuireRect;
  /** Measured visual table rectangle before page projection. */
  readonly tableRect: QuireRect;
  /** Table indent resolved during neutral table measurement. */
  readonly indent: number;
  /** Zero-based physical page index used by inside/outside alignment. */
  readonly pageIndex: number;
}

/** Resolved document-space origin for one floating table. */
export interface QuireTableFloatingPosition {
  /** Resolved table-left coordinate. */
  readonly x: number;
  /** Resolved table-top coordinate. */
  readonly y: number;
}

/** Input used to derive a sequential flow footprint for one floating table. */
export interface QuireTableFloatingFlowFootprintInput {
  /** Canonical floating placement source. */
  readonly placement: QuireTableFloatingPlacement;
  /** Measured visual table width in CSS pixels. */
  readonly tableWidth: number;
  /** Measured visual table height in CSS pixels. */
  readonly tableHeight: number;
  /** Inline extent of the containing body flow in CSS pixels. */
  readonly containingInlineSize: number;
}

/** Derived sequential flow effect of one floating table. */
export type QuireTableFloatingFlowFootprint =
  | {
      /** The table leaves usable side flow or has a non-sequential anchor. */
      readonly kind: "none";
      /** Zero block-flow extent. */
      readonly height: 0;
    }
  | {
      /** The clearance-expanded table obstructs the complete inline flow. */
      readonly kind: "block";
      /** Reserved block-flow extent from the logical text anchor. */
      readonly height: number;
    };
