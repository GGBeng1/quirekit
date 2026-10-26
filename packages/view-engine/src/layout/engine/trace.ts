import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";

/**
 * Runs one layout phase and reports its duration when tracing is enabled.
 *
 * @param trace - Optional trace sink receiving the measured phase.
 * @param name - Stable phase name used by diagnostics.
 * @param callback - Layout work to measure.
 * @returns The callback result.
 */
export function traceQuireLayoutPhase<Result>(
  trace: QuireLayoutTraceSink | undefined,
  name: string,
  callback: () => Result
): Result {
  if (trace === undefined) {
    return callback();
  }

  const startedAt = globalThis.performance?.now() ?? Date.now();
  try {
    return callback();
  } finally {
    const endedAt = globalThis.performance?.now() ?? Date.now();
    trace({ name, startedAt, endedAt, durationMs: endedAt - startedAt });
  }
}
