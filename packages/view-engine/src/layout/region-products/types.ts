import type { QuireHitTarget } from "../engine/types";
import type {
  QuireLayoutRegion,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionProductGap,
  QuireRetainedRegionSelectionPolicy
} from "./declaration";
import type { QuireRetainedLayerContribution } from "./layer-contribution";

/** A text line whose pagination placement also owns an independent control. */
export interface QuireRetainedRegionTextLine {
  /** Source line top relative to the retained region's rectangle. */
  readonly topOffset: number;
  /** Source baseline relative to the retained region's rectangle. */
  readonly baselineOffset: number;
}

/** View-owned region with optional text-line pagination dependency. */
export interface QuireRetainedRegion extends QuireLayoutRegion {
  /** Line anchor used for baseline acceptance and local flow rebasing. */
  readonly textLine?: QuireRetainedRegionTextLine | undefined;
}

/** Canonical retained products contributed by non-body layout producers. */
export interface QuireRetainedRegionProducts {
  /** Valid roots available to retained graph construction. */
  readonly roots: readonly QuireLayoutRoot[];
  /** Valid regions available to retained graph construction. */
  readonly regions: readonly QuireRetainedRegion[];
  /** Region-owned targets available to interaction geometry. */
  readonly hitTargets: readonly QuireHitTarget[];
  /** Region-owned renderer-neutral artifacts available to shared consumers. */
  readonly layerContributions: readonly QuireRetainedLayerContribution[];
  /** Region-owned policies available to selection and command routing. */
  readonly selectionPolicies: readonly QuireRetainedRegionSelectionPolicy[];
  /** Rejected declarations and missing facts exposed to diagnostics. */
  readonly gaps: readonly QuireRetainedRegionProductGap[];
}
