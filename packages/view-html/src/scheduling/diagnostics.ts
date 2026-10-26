import type { QuireViewMeasuredPhase } from "@quirekit/view/mounted-backend";
import type { HtmlRenderPhase } from "./types";

/**
 * Measures one HTML render phase.
 *
 * @param name - Stable phase name.
 * @param now - Monotonic clock.
 * @param work - Phase work to execute.
 * @param phases - Mutable render-local phase collection.
 * @returns Value returned by the phase work.
 */
export function measureHtmlRenderPhase<T>(
  name: HtmlRenderPhase,
  now: () => number,
  work: () => T,
  phases: QuireViewMeasuredPhase[]
): T {
  const startedAt = now();
  try {
    return work();
  } finally {
    const endedAt = now();
    phases.push({
      name,
      startedAt,
      endedAt,
      durationMs: Math.max(0, endedAt - startedAt)
    });
  }
}
