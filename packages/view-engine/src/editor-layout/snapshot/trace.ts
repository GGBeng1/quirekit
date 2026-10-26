import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";

/**
 * Runs one canonical layout phase with optional timing diagnostics.
 *
 * @param trace - Optional layout timing sink.
 * @param name - Stable phase name.
 * @param run - Phase implementation.
 * @returns Phase result.
 */
export function traceQuireLayoutStage<Result>(
  trace: QuireLayoutTraceSink | undefined,
  name: string,
  run: () => Result
): Result {
  if (trace === undefined) {
    return run();
  }
  const startedAt = globalThis.performance?.now() ?? Date.now();
  try {
    return run();
  } finally {
    const endedAt = globalThis.performance?.now() ?? Date.now();
    trace({ name, startedAt, endedAt, durationMs: endedAt - startedAt });
  }
}
