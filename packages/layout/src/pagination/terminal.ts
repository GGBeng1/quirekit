import type { QuireDocumentRange } from "@quirekit/renderer";

/** Model-neutral constraint for a measured bottom region in the final section. */
export interface QuireTerminalRegionConstraint {
  /** Exact source range of the measured region. */
  readonly range: QuireDocumentRange;
  /** Required separation above the region, in CSS pixels. */
  readonly separation: number;
  /** Page-band source ranges omitted only after an inserted padding sheet. */
  readonly omitBandRangesAfterPadding: readonly QuireDocumentRange[];
}

/** Accepted terminal-section placement, retained independently of visible page windows. */
export interface QuireTerminalPlacement {
  /** Top-level source index of the terminal section. */
  readonly sectionIndex: number;
  /** Canonical position before the terminal section owner. */
  readonly sectionPosition: number;
  /** Whether the terminal region shares the previous section's final physical sheet. */
  readonly sharesPreviousPage: boolean;
  /** Whether a derived empty sheet immediately precedes this section. */
  readonly precededByPadding: boolean;
  /** Whether the entire terminal region fits its physical body area. */
  readonly fits: boolean;
}
