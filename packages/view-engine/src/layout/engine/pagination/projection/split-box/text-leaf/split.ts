import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutBox } from "../../../../types";
import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";
import { forwardQuireLayoutSignature } from "@quirekit/layout/block-flow";
import { sliceQuireInlineTextRunsToRange } from "@quirekit/layout/inline";
import { sliceQuireInlineSourceProductsToRange } from "../../../../inline/source-capability";
import { readQuireTextFragmentFlowOrderMetadata } from "@quirekit/layout/text";
import {
  createQuireProjectionSourceFlowClip,
  hasQuireMeasuredSourceFlowClip
} from "../../source-flow";
import type { QuirePageBodyProjection } from "../../types";
import { splitOrderedMeasuredTextFragmentsIntoBuckets } from "./bucket";
import { projectTextBlockBand } from "./geometry";
import type {
  QuireOrderedMeasuredProjectionClip,
  QuireTextLeafPageBucket
} from "./types";
import { traceQuireLayoutPhase } from "../../../../trace";
import { resolveQuireProjectionOccurrence } from "../../occurrence";

/**
 * Splits a text-only leaf through ordered measured page bands.
 *
 * This is a pre-chunk bridge for the common long-paragraph path. It keeps exact
 * compatibility fallbacks for unmarked, unmeasured, table, and container inputs,
 * while retained sorted text leaves avoid the generic content bucketer's
 * Map/sort path and repeated projection-clip proof.
 *
 * @param box - Source-flow text leaf box.
 * @param fragments - Source-flow text fragments owned by the box.
 * @param projections - Page-body projections to split through.
 * @param trace - Optional trace sink receiving split subphase timings.
 * @returns Page-local split boxes, or undefined when generic measured bucketing is needed.
 */
export function trySplitOrderedMeasuredTextLeafAcrossPages(
  box: QuireLayoutBox,
  fragments: readonly QuireTextFragment[],
  projections: readonly QuirePageBodyProjection[],
  trace?: QuireLayoutTraceSink | undefined
): readonly QuireLayoutBox[] | undefined {
  if (
    fragments.length === 0 ||
    readQuireTextFragmentFlowOrderMetadata(fragments)?.sortedByLineTop !== true
  ) {
    return undefined;
  }

  const measuredClips = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:create-clips",
    () => createOrderedMeasuredProjectionClips(projections)
  );
  if (measuredClips === undefined) {
    return undefined;
  }

  const buckets = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:bucket",
    () => splitOrderedMeasuredTextFragmentsIntoBuckets(
      fragments,
      measuredClips,
      trace
    )
  );
  if (buckets.length === 0) {
    return [];
  }

  return traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:map-boxes",
    () =>
      buckets.map((bucket, index) => createOrderedTextLeafPageBox(
        box,
        bucket,
        index === 0,
        index === buckets.length - 1
      ))
  );
}

/**
 * Creates one page-local text leaf box without opening lazy source properties.
 *
 * @param box - Source-flow text leaf box.
 * @param bucket - Page-local bucket derived from the source leaf.
 * @param isFirstFragment - Whether this bucket owns the paragraph top edge.
 * @param isLastFragment - Whether this bucket owns the paragraph bottom edge.
 * @returns Page-local text leaf box.
 */
function createOrderedTextLeafPageBox(
  box: QuireLayoutBox,
  bucket: QuireTextLeafPageBucket,
  isFirstFragment: boolean,
  isLastFragment: boolean
): QuireLayoutBox {
  const pageBox: QuireLayoutBox = {
    id: `${box.id}#p${resolveQuireProjectionOccurrence(bucket.projection)}`,
    range: bucket.range,
    rect: box.inlineLayoutRect === undefined ? bucket.rect
      : projectTextBlockBand(box.rect, bucket.projection, bucket.rect),
    ...(box.inlineLayoutRect === undefined
      ? {}
      : {
          inlineLayoutRect: projectTextBlockBand(
            box.inlineLayoutRect,
            bucket.projection,
            bucket.rect
          )
        }),
    ...(box.nodeHandle === undefined ? {} : { nodeHandle: box.nodeHandle }),
    ...(box.table === undefined ? {} : { table: box.table }),
    ...(box.paragraphDecoration === undefined
      ? {}
      : {
          paragraphDecoration: {
            ...box.paragraphDecoration,
            firstFragment: box.paragraphDecoration.firstFragment && isFirstFragment,
            lastFragment: box.paragraphDecoration.lastFragment && isLastFragment
          }
        }),
    ...(box.textRuns === undefined
      ? {}
      : { textRuns: sliceQuireInlineTextRunsToRange(box.textRuns, bucket.range) }),
    ...sliceQuireInlineSourceProductsToRange(box, bucket.range),
    textFragments: bucket.fragments
  };

  return forwardQuireLayoutSignature(pageBox, box);
}

/**
 * Creates ordered measured clips for page projections.
 *
 * @param projections - Candidate page projections.
 * @returns Ordered clips, or undefined when generic measured bucketing is required.
 */
function createOrderedMeasuredProjectionClips(
  projections: readonly QuirePageBodyProjection[]
): readonly QuireOrderedMeasuredProjectionClip[] | undefined {
  const clips: QuireOrderedMeasuredProjectionClip[] = [];
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

    clips.push({ projection, clip });
    previousBottom = clip.bottom;
  }

  return clips;
}
