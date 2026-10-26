import type { QuireTextFragment } from "@quirekit/layout/text";
import {
  cacheQuireTextFragmentFlowOrderMetadata,
  readQuireTextFragmentFlowOrderMetadata,
  type QuireTextFragmentFlowOrderMetadata
} from "@quirekit/layout/text";
import { doesQuireTextFragmentStartInFlowBand } from "@quirekit/layout/pagination";
import { findQuirePageBodyProjectionForTextFragment } from "./page";
import {
  createQuireProjectionSourceFlowClip,
  hasQuireMeasuredSourceFlowClip,
  type QuireSourceFlowClip
} from "./source-flow";
import { translateQuireTextFragment } from "./translate";
import type { QuirePageBodyProjection } from "./types";
import { findFirstTextFragmentAtOrAfterFlowTop } from "./split-box/text-leaf/geometry";

/** Options for bucketing source text fragments into page-local projections. */
export interface QuireTextFragmentPageBucketOptions {
  /** Source text fragments in flow coordinates. */
  readonly fragments: readonly QuireTextFragment[];
  /** Page-body projections that may own the fragments. */
  readonly projections: readonly QuirePageBodyProjection[];
  /**
   * Receives one fragment already translated into the owning page.
   *
   * @param projection - Projection that owns the translated fragment.
   * @param fragment - Page-local translated text fragment.
   * @returns Nothing.
   */
  readonly addProjectedFragment: (
    projection: QuirePageBodyProjection,
    fragment: QuireTextFragment
  ) => void;
}

/** Source-flow clip paired with the projection that owns it. */
interface QuireMeasuredProjectionFlowClip {
  /** Page projection that owns the flow clip. */
  readonly projection: QuirePageBodyProjection;
  /** Measured source-flow band for the page. */
  readonly clip: QuireSourceFlowClip;
}

/**
 * Buckets text fragments by page projection.
 *
 * The measured-flow fast path turns the common sorted long-paragraph case from
 * "find a projection for every fragment" into a single forward scan. It is used
 * only when every projection has a measured source-flow band and those bands are
 * ordered without overlap; unordered inputs keep the full measured search path.
 *
 * @param options - Source fragments, page projections, and append callback.
 * @returns Nothing.
 */
export function bucketQuireTextFragmentsByPage(
  options: QuireTextFragmentPageBucketOptions
): void {
  if (options.fragments.length === 0 || options.projections.length === 0) {
    return;
  }

  const measuredClips = createMeasuredProjectionFlowClips(options.projections);
  const flowOrder = readTextFragmentFlowOrderMetadata(options.fragments);

  if (measuredClips !== undefined && flowOrder.sortedByLineTop) {
    bucketSortedMeasuredTextFragmentsByPage(options, measuredClips);
    return;
  }

  bucketTextFragmentsByMeasuredSearch(options);
}

/**
 * Creates measured source-flow clips when projections are sorted and disjoint.
 *
 * @param projections - Candidate page projections.
 * @returns Measured clips, or undefined when the full measured search is required.
 */
function createMeasuredProjectionFlowClips(
  projections: readonly QuirePageBodyProjection[]
): readonly QuireMeasuredProjectionFlowClip[] | undefined {
  const clips: QuireMeasuredProjectionFlowClip[] = [];
  let previousBottom = -Infinity;

  for (let index = 0; index < projections.length; index += 1) {
    const projection = projections[index]!;
    if (!hasQuireMeasuredSourceFlowClip(projection)) {
      return undefined;
    }

    const clip = createQuireProjectionSourceFlowClip(projection);
    if (
      !Number.isFinite(clip.top) ||
      !Number.isFinite(clip.bottom) ||
      clip.top < previousBottom
    ) {
      return undefined;
    }

    previousBottom = clip.bottom;
    clips.push({ projection, clip });
  }

  return clips;
}

/**
 * Reads or computes fragment flow-order metadata.
 *
 * @param fragments - Fragment array to inspect.
 * @returns Cached ordering metadata for the array identity.
 */
function readTextFragmentFlowOrderMetadata(
  fragments: readonly QuireTextFragment[]
): QuireTextFragmentFlowOrderMetadata {
  const cached = readQuireTextFragmentFlowOrderMetadata(fragments);
  if (cached !== undefined) {
    return cached;
  }

  let previousY = -Infinity;
  let sortedByLineTop = true;
  for (let index = 0; index < fragments.length; index += 1) {
    const y = fragments[index]!.rect.y;
    if (!Number.isFinite(y) || y < previousY) {
      sortedByLineTop = false;
      break;
    }
    previousY = y;
  }

  const metadata = { sortedByLineTop };
  cacheQuireTextFragmentFlowOrderMetadata(fragments, metadata);

  return metadata;
}

/**
 * Buckets sorted fragments through ordered measured source-flow clips.
 *
 * @param options - Source fragments and append callback.
 * @param measuredClips - Ordered non-overlapping measured projection clips.
 * @returns Nothing.
 */
function bucketSortedMeasuredTextFragmentsByPage(
  options: QuireTextFragmentPageBucketOptions,
  measuredClips: readonly QuireMeasuredProjectionFlowClip[]
): void {
  let fragmentIndex = findFirstTextFragmentAtOrAfterFlowTop(
    options.fragments,
    measuredClips[0]?.clip.top ?? -Infinity
  );

  for (let clipIndex = 0; clipIndex < measuredClips.length; clipIndex += 1) {
    const { projection, clip } = measuredClips[clipIndex]!;

    while (
      fragmentIndex < options.fragments.length &&
      options.fragments[fragmentIndex]!.rect.y < clip.top
    ) {
      fragmentIndex += 1;
    }

    let scanIndex = fragmentIndex;
    while (scanIndex < options.fragments.length) {
      const fragment = options.fragments[scanIndex]!;
      if (fragment.rect.y >= clip.bottom) {
        break;
      }

      if (doesQuireTextFragmentStartInFlowBand(fragment, clip)) {
        options.addProjectedFragment(
          projection,
          translateQuireTextFragment(fragment, projection)
        );
      }
      scanIndex += 1;
    }

    fragmentIndex = scanIndex;
  }
}

/**
 * Buckets fragments with the full measured projection search.
 *
 * @param options - Source fragments and append callback.
 * @returns Nothing.
 */
function bucketTextFragmentsByMeasuredSearch(
  options: QuireTextFragmentPageBucketOptions
): void {
  for (let index = 0; index < options.fragments.length; index += 1) {
    const fragment = options.fragments[index]!;
    const projection = findQuirePageBodyProjectionForTextFragment(
      fragment,
      options.projections
    );

    if (projection === undefined) {
      continue;
    }

    options.addProjectedFragment(
      projection,
      translateQuireTextFragment(fragment, projection)
    );
  }
}
