import type { OFDPageBlockChildSnapshot } from "../document/state";
import type { OFDBox } from "../model";
import type { OFDAnnotationOptions } from "./types";

/** Immutable static annotation appearance built from page-block children. */
export interface OFDAnnotationAppearanceSnapshot {
  /** Required page-coordinate boundary of the appearance. */
  readonly boundary: Readonly<OFDBox>;
  /** Ordered graphics and nested page blocks painted by the appearance. */
  readonly children: readonly OFDPageBlockChildSnapshot[];
}

/** Immutable page-local annotation snapshot. */
export interface OFDAnnotationSnapshot {
  /** Frozen standard annotation properties. */
  readonly options: Readonly<OFDAnnotationOptions>;
  /** Required static annotation appearance. */
  readonly appearance: OFDAnnotationAppearanceSnapshot;
}
