import type { QuireViewMeasuredPhase, QuireViewTraceSink } from "../types";

/**
 * Isolates a retained diagnostic callback from the mounted frame's lexical scope.
 *
 * Paragraph reflow may retain this sink after its frame is replaced. Only the
 * timing array may survive through it, never the old render result or surface.
 * @param phases - Timing records owned by the diagnostic consumer.
 * @returns A sink capturing only the supplied timing array.
 */
export function createQuireViewTraceSink(phases: QuireViewMeasuredPhase[]): QuireViewTraceSink {
  return (phase) => { phases.push(phase); };
}

/**
 * Runs a canvas view phase and emits its measured timing when tracing is enabled.
 *
 * @param trace - Optional trace sink receiving the measured phase.
 * @param name - Stable phase name shown in diagnostics.
 * @param callback - Work to measure.
 * @returns Callback return value.
 */
export function traceQuireViewPhase<Result>(
  trace: QuireViewTraceSink | undefined,
  name: string,
  callback: () => Result
): Result {
  if (!trace) {
    return callback();
  }

  const startedAt = readQuireViewTraceTime();

  try {
    return callback();
  } finally {
    const endedAt = readQuireViewTraceTime();
    trace({
      name,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt
    });
  }
}

/**
 * Reads the best monotonic timestamp available to the canvas view runtime.
 *
 * @returns Timestamp in milliseconds.
 */
function readQuireViewTraceTime(): number {
  return globalThis.performance?.now() ?? Date.now();
}
