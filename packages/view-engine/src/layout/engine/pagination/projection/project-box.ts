import type { QuireLayoutBox } from "../../types";
import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";
import { findQuirePageBodyProjectionForCompleteBox } from "./page";
import { isQuireLayoutContainer } from "./guards";
import { splitQuireLayoutBoxAcrossPages } from "./split-box";
import { translateQuireLayoutBox } from "./translate";
import type { QuirePageBodyProjection, QuireProjectLoopTimingStats } from "./types";
import { traceQuireLayoutPhase } from "../../trace";
import { createProjectedLayoutBoxesSignature, readProjectedLayoutBoxes, retainProjectedLayoutBoxes } from "./cache/box-list";

/**
 * Projects layout boxes, flat-mapping straddling boxes into per-page boxes.
 *
 * @param boxes - Layout boxes to project.
 * @param projections - Available page-body projections.
 * @param trace - Optional trace sink receiving project-box subphase timings.
 * @returns Projected boxes, preserving the original array when nothing changed.
 */
export function projectQuireLayoutBoxes(
  boxes: readonly QuireLayoutBox[],
  projections: readonly QuirePageBodyProjection[],
  trace?: QuireLayoutTraceSink | undefined
): readonly QuireLayoutBox[] {
  const signature = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:signature",
    () => createProjectedLayoutBoxesSignature(boxes, projections)
  );
  const cached = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:cache-lookup",
    () => readProjectedLayoutBoxes(signature)
  );
  if (cached !== undefined) {
    return cached;
  }

  const result = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:project-loop",
    () => projectQuireLayoutBoxesUncached(boxes, projections, trace)
  );
  traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes:cache-store",
    () => retainProjectedLayoutBoxes(signature, result)
  );

  return result;
}

/**
 * Projects layout boxes after the whole-list cache has missed.
 *
 * @param boxes - Layout boxes to project.
 * @param projections - Available page-body projections.
 * @param trace - Optional trace sink passed to recursive split projection.
 * @returns Projected layout boxes.
 */
function projectQuireLayoutBoxesUncached(
  boxes: readonly QuireLayoutBox[],
  projections: readonly QuirePageBodyProjection[],
  trace?: QuireLayoutTraceSink | undefined
): readonly QuireLayoutBox[] {
  const projected: QuireLayoutBox[] = [];
  const timingStats = createQuireProjectLoopTimingStats();
  let changed = false;

  for (const box of boxes) {
    const projection = measureQuireProjectLoopStep(
      timingStats,
      "completeOwnershipMs",
      () => findQuirePageBodyProjectionForCompleteBox(box, projections)
    );

    if (projection !== undefined) {
      const translated = measureQuireProjectLoopStep(
        timingStats,
        "completeTranslateMs",
        () => translateQuireLayoutBox(box, projection)
      );
      projected.push(translated);
      changed = changed || translated !== box;
      continue;
    }

    const splitTimingKey = isQuireLayoutContainer(box)
      ? "splitContainerMs"
      : "splitLeafMs";
    const result = measureQuireProjectLoopStep(
      timingStats,
      splitTimingKey,
      () =>
        splitQuireLayoutBoxAcrossPages(
          box,
          projections,
          (childBoxes, pageProjections) =>
            projectQuireLayoutBoxes(childBoxes, pageProjections, trace),
          trace
        )
    );

    changed = true;
    for (let index = 0; index < result.length; index += 1) {
      projected.push(result[index]!);
    }
  }

  const result = changed ? projected : boxes;
  traceQuireProjectLoopTimingStats(trace, timingStats);

  return result;
}

/**
 * Creates empty project-loop timing buckets.
 *
 * @returns Mutable timing bucket collection for one uncached projection pass.
 */
function createQuireProjectLoopTimingStats(): QuireProjectLoopTimingStats {
  return {
    completeOwnershipMs: 0,
    completeTranslateMs: 0,
    splitLeafMs: 0,
    splitContainerMs: 0
  };
}

/**
 * Measures one portion of the uncached project loop into an aggregate bucket.
 *
 * @param stats - Mutable aggregate timing buckets for the project loop.
 * @param key - Timing bucket to increment.
 * @param callback - Work to measure.
 * @returns Callback result.
 */
function measureQuireProjectLoopStep<Result>(
  stats: QuireProjectLoopTimingStats,
  key: keyof QuireProjectLoopTimingStats,
  callback: () => Result
): Result {
  const startedAt = globalThis.performance?.now() ?? Date.now();
  try {
    return callback();
  } finally {
    const endedAt = globalThis.performance?.now() ?? Date.now();
    stats[key] += endedAt - startedAt;
  }
}

/**
 * Emits all project-loop timing buckets to the trace sink.
 *
 * @param trace - Optional trace sink.
 * @param stats - Aggregate timing buckets measured during the project loop.
 */
function traceQuireProjectLoopTimingStats(
  trace: QuireLayoutTraceSink | undefined,
  stats: QuireProjectLoopTimingStats
): void {
  if (trace === undefined) {
    return;
  }

  traceQuireProjectLoopTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:complete-ownership",
    stats.completeOwnershipMs
  );
  traceQuireProjectLoopTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:complete-translate",
    stats.completeTranslateMs
  );
  traceQuireProjectLoopTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:split-leaf",
    stats.splitLeafMs
  );
  traceQuireProjectLoopTimingStat(
    trace,
    "layout:paginate:project:boxes:project-loop:split-container",
    stats.splitContainerMs
  );
}

/**
 * Emits one aggregate project-loop timing.
 *
 * @param trace - Trace sink receiving the synthetic aggregate phase.
 * @param name - Stable aggregate phase name.
 * @param durationMs - Duration accumulated by the project loop.
 */
function traceQuireProjectLoopTimingStat(
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
