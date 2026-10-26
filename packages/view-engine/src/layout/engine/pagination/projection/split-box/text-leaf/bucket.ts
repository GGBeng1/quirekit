import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";
import { markQuireTextFragmentsSortedByLineTop } from "@quirekit/layout/text";
import { translateQuireTextFragment } from "../../translate";
import type { QuirePageBodyProjection } from "../../types";
import { findFirstTextFragmentAtOrAfterFlowTop } from "./geometry";
import type {
  MutableQuireTextLeafPageBucket,
  QuireOrderedMeasuredProjectionClip,
  QuireTextLeafPageBucket
} from "./types";

/** Aggregate timing buckets for one ordered text-leaf bucket pass. */
interface QuireOrderedTextLeafBucketTimingStats {
  /** Time spent locating the first fragment for the first active page clip. */
  firstIndexMs: number;
  /** Time spent translating source fragments into page coordinates. */
  translateMs: number;
  /** Time spent creating or expanding mutable page buckets. */
  appendMs: number;
  /** Time spent freezing mutable buckets into returned immutable entries. */
  finalizeMs: number;
}

/**
 * Splits ordered fragments into page-local buckets.
 *
 * @param fragments - Source fragments sorted by line top.
 * @param measuredClips - Ordered measured page clips.
 * @param trace - Optional trace sink receiving bucket subphase timings.
 * @returns Page-local text buckets.
 */
export function splitOrderedMeasuredTextFragmentsIntoBuckets(
  fragments: readonly QuireTextFragment[],
  measuredClips: readonly QuireOrderedMeasuredProjectionClip[],
  trace?: QuireLayoutTraceSink | undefined
): readonly QuireTextLeafPageBucket[] {
  const buckets: QuireTextLeafPageBucket[] = [];
  const timingStats =
    trace === undefined ? undefined : createOrderedTextLeafBucketTimingStats();
  let fragmentIndex = measureOrderedTextLeafBucketStep(
    timingStats,
    "firstIndexMs",
    () =>
      findFirstTextFragmentAtOrAfterFlowTop(
        fragments,
        measuredClips[0]?.clip.top ?? -Infinity
      )
  );

  for (let clipIndex = 0; clipIndex < measuredClips.length; clipIndex += 1) {
    const measuredClip = measuredClips[clipIndex]!;

    while (
      fragmentIndex < fragments.length &&
      fragments[fragmentIndex]!.rect.y < measuredClip.clip.top
    ) {
      fragmentIndex += 1;
    }

    let bucket: MutableQuireTextLeafPageBucket | undefined;
    while (fragmentIndex < fragments.length) {
      const fragment = fragments[fragmentIndex]!;
      if (fragment.rect.y >= measuredClip.clip.bottom) {
        break;
      }

      const projected = measureOrderedTextLeafBucketStep(
        timingStats,
        "translateMs",
        () => translateQuireTextFragment(fragment, measuredClip.projection)
      );
      bucket = measureOrderedTextLeafBucketStep(
        timingStats,
        "appendMs",
        () =>
          bucket === undefined
            ? createMutableTextLeafPageBucket(
                measuredClip.projection,
                projected
              )
            : appendTextLeafPageBucketFragment(bucket, projected)
      );
      fragmentIndex += 1;
    }

    if (bucket !== undefined) {
      measureOrderedTextLeafBucketStep(timingStats, "finalizeMs", () => {
        buckets.push(finalizeMutableTextLeafPageBucket(bucket));
      });
    }
  }

  traceOrderedTextLeafBucketTimingStats(trace, timingStats);

  return buckets;
}

/**
 * Creates a mutable page bucket from its first projected fragment.
 *
 * @param projection - Page projection that owns the bucket.
 * @param fragment - First projected fragment in the bucket.
 * @returns Mutable page bucket.
 */
function createMutableTextLeafPageBucket(
  projection: QuirePageBodyProjection,
  fragment: QuireTextFragment
): MutableQuireTextLeafPageBucket {
  const right = fragment.rect.x + fragment.rect.width;
  const bottom = fragment.rect.y + fragment.rect.height;

  return {
    pageIndex: projection.page.pageIndex,
    projection,
    rangeFrom: fragment.range.from,
    rangeTo: fragment.range.to,
    x: fragment.rect.x,
    y: fragment.rect.y,
    right,
    bottom,
    fragments: [fragment]
  };
}

/**
 * Appends one projected fragment to a mutable page bucket.
 *
 * @param bucket - Mutable page bucket.
 * @param fragment - Projected fragment to append.
 * @returns Mutable page bucket after expansion.
 */
function appendTextLeafPageBucketFragment(
  bucket: MutableQuireTextLeafPageBucket,
  fragment: QuireTextFragment
): MutableQuireTextLeafPageBucket {
  bucket.rangeFrom = Math.min(bucket.rangeFrom, fragment.range.from);
  bucket.rangeTo = Math.max(bucket.rangeTo, fragment.range.to);
  bucket.x = Math.min(bucket.x, fragment.rect.x);
  bucket.y = Math.min(bucket.y, fragment.rect.y);
  bucket.right = Math.max(bucket.right, fragment.rect.x + fragment.rect.width);
  bucket.bottom = Math.max(
    bucket.bottom,
    fragment.rect.y + fragment.rect.height
  );
  bucket.fragments.push(fragment);

  return bucket;
}

/**
 * Freezes one mutable text leaf bucket into the returned page-local shape.
 *
 * @param bucket - Mutable bucket accumulated with scalar bounds.
 * @returns Immutable page-local text leaf bucket.
 */
function finalizeMutableTextLeafPageBucket(
  bucket: MutableQuireTextLeafPageBucket
): QuireTextLeafPageBucket {
  return {
    pageIndex: bucket.pageIndex,
    projection: bucket.projection,
    range: { from: bucket.rangeFrom, to: bucket.rangeTo },
    rect: {
      x: bucket.x,
      y: bucket.y,
      width: bucket.right - bucket.x,
      height: bucket.bottom - bucket.y
    },
    fragments: markQuireTextFragmentsSortedByLineTop(bucket.fragments)
  };
}

/**
 * Creates empty ordered text-leaf bucket timing buckets.
 *
 * @returns Mutable timing bucket collection for one bucket pass.
 */
function createOrderedTextLeafBucketTimingStats(): QuireOrderedTextLeafBucketTimingStats {
  return {
    firstIndexMs: 0,
    translateMs: 0,
    appendMs: 0,
    finalizeMs: 0
  };
}

/**
 * Measures one optional ordered text-leaf bucket subphase.
 *
 * @param stats - Mutable aggregate timing buckets, or undefined when tracing is off.
 * @param key - Timing bucket to increment.
 * @param callback - Work to measure.
 * @returns Callback result.
 */
function measureOrderedTextLeafBucketStep<Result>(
  stats: QuireOrderedTextLeafBucketTimingStats | undefined,
  key: keyof QuireOrderedTextLeafBucketTimingStats,
  callback: () => Result
): Result {
  if (stats === undefined) {
    return callback();
  }

  const startedAt = globalThis.performance?.now() ?? Date.now();
  try {
    return callback();
  } finally {
    const endedAt = globalThis.performance?.now() ?? Date.now();
    stats[key] += endedAt - startedAt;
  }
}

/**
 * Emits ordered text-leaf bucket aggregate timings to the trace sink.
 *
 * @param trace - Optional layout trace sink.
 * @param stats - Aggregate timing buckets, or undefined when tracing is off.
 * @returns Nothing.
 */
function traceOrderedTextLeafBucketTimingStats(
  trace: QuireLayoutTraceSink | undefined,
  stats: QuireOrderedTextLeafBucketTimingStats | undefined
): void {
  if (trace === undefined || stats === undefined) {
    return;
  }

  traceOrderedTextLeafBucketTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:bucket:first-index",
    stats.firstIndexMs
  );
  traceOrderedTextLeafBucketTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:bucket:translate",
    stats.translateMs
  );
  traceOrderedTextLeafBucketTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:bucket:append",
    stats.appendMs
  );
  traceOrderedTextLeafBucketTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf:ordered:bucket:finalize",
    stats.finalizeMs
  );
}

/**
 * Emits one ordered text-leaf bucket aggregate timing.
 *
 * @param trace - Trace sink receiving the synthetic aggregate phase.
 * @param name - Stable aggregate phase name.
 * @param durationMs - Duration accumulated by the bucket pass.
 * @returns Nothing.
 */
function traceOrderedTextLeafBucketTimingStat(
  trace: QuireLayoutTraceSink,
  name: string,
  durationMs: number
): void {
  const endedAt = globalThis.performance?.now() ?? Date.now();
  trace({
    name,
    startedAt: endedAt - durationMs,
    endedAt,
    durationMs
  });
}
