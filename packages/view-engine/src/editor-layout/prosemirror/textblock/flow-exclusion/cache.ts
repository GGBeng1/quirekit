import type { QuireTextFragment } from "@quirekit/layout/text";
import type { CanvasBlockShapeCache } from "../../../../layout/cache";

/** Shape-cache variant reserved for full-width baseline caret topology. */
export const quireTextblockFlowBaselineCacheVariant = "flow-baseline";

/** Inputs used to reuse or produce full-width flow baseline fragments. */
export interface ResolveQuireTextblockFlowBaselineOptions {
  /** Mounted block-shape cache. */
  readonly cache: CanvasBlockShapeCache;
  /** Immutable textblock node identity. */
  readonly node: object;
  /** Current paragraph width. */
  readonly width: number;
  /** Absolute document position at the paragraph content start. */
  readonly contentStart: number;
  /** Current block id embedded in fragment ids. */
  readonly id?: string | undefined;
  /** Exact measurement-plus-baseline cache variant. */
  readonly cacheVariant?: string | undefined;
  /** Produces baseline fragments only when the cache misses. */
  readonly shape: () => readonly QuireTextFragment[];
}

/**
 * Creates the shape-cache variant for one exact row-slot geometry.
 *
 * The baseline remains independent from flow intent. Final fragments are keyed
 * by the compiled slot signature so changes to placement, clearance, side
 * policy, or provider-owned geometry cannot reuse a fixed-width or differently
 * wrapped result.
 *
 * @param slotSignature - Stable physical row-slot signature.
 * @returns Cache variant owned by that exact flow geometry.
 */
export function createQuireTextblockFlowShapeCacheVariant(
  slotSignature: string
): string {
  return `flow-slots:${slotSignature}`;
}

/**
 * Reuses or produces the full-width shape used for anchor caret topology.
 *
 * @param options - Cache identity and lazy baseline shaper.
 * @returns Baseline fragments at the current document position.
 */
export function resolveQuireTextblockFlowBaseline(
  options: ResolveQuireTextblockFlowBaselineOptions
): readonly QuireTextFragment[] {
  const cached = options.cache.get(
    options.node,
    options.width,
    options.contentStart,
    options.cacheVariant ?? quireTextblockFlowBaselineCacheVariant,
    options.id
  );
  if (cached !== undefined) {
    return cached;
  }

  const fragments = options.shape();
  options.cache.set(
    options.node,
    options.width,
    options.contentStart,
    fragments,
    options.cacheVariant ?? quireTextblockFlowBaselineCacheVariant,
    options.id
  );
  return fragments;
}
