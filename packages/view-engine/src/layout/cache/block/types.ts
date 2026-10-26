import type { QuireBlockLayoutInput, QuireBlockTextFlowReflow } from "../../engine/block-types";
import type {
  QuireInlineSourceCapabilityResolverInput,
  QuireInlineSourceCapabilityResolverResult
} from "../../engine/inline/source-capability";

/** Current collector authority for replacing a moved source-bound service. */
export type QuireTextblockFlowRebinder = (
  source: QuireBlockTextFlowReflow
) => QuireBlockTextFlowReflow | undefined;

/** One inline capability resolution made while a textblock input was collected. */
export interface QuireTextblockCapabilityResolution {
  /** Resolver input; its position is absolute at collection time. */
  readonly input: QuireInlineSourceCapabilityResolverInput;
  /** Resolver result, or undefined when no resolver claimed the node. */
  readonly result: QuireInlineSourceCapabilityResolverResult | undefined;
}

/** Capability resolutions recorded for one cached textblock input. */
export interface QuireTextblockCapabilityRecord {
  /** Resolutions in collection order. */
  readonly resolutions: readonly QuireTextblockCapabilityResolution[];
  /** Placement identity of the results, distinguishing variants of one paragraph. */
  readonly placementKey: string;
}

/** Fresh capability products replacing those of a reused cached input. */
export interface QuireTextblockCapabilityRebind {
  /** Sidecars resolved at the current position, in collection order. */
  readonly sourceCapabilities: NonNullable<QuireBlockLayoutInput["sourceCapabilities"]>;
  /**
   * @param input - Relocated input carrying the fresh sidecars.
   * @returns Its position-independent layout signature.
   */
  readonly layoutSignature: (input: QuireBlockLayoutInput) => string | undefined;
}

/**
 * Re-resolves recorded capabilities of a cached input moved by `delta`.
 *
 * @param record - Resolutions recorded when the input was collected.
 * @param delta - Current minus cached absolute content start.
 * @returns Fresh products when every placement is unchanged, otherwise undefined.
 */
export type QuireTextblockCapabilityRevalidator = (
  record: QuireTextblockCapabilityRecord,
  delta: number
) => QuireTextblockCapabilityRebind | undefined;

/** Cached textblock input at a stable width, id, and document position. */
export interface CanvasBlockInputCacheEntry {
  /** Content width the textblock input was collected against. */
  readonly width: number;
  /** Stable block id used by the collected input and its fragment ids. */
  readonly id: string;
  /** Document position at the block content start when the input was collected. */
  readonly contentStart: number;
  /** Geometry/dependency variant that produced the input. */
  readonly variant: string;
  /** Collected local block input for an unchanged textblock. */
  readonly input: QuireBlockLayoutInput;
  /** Capability resolutions that must be repeated before a capability-bearing input is reused. */
  readonly capabilities?: QuireTextblockCapabilityRecord | undefined;
}
