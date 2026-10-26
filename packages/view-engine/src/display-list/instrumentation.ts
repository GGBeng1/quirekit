import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireDisplayListOptions } from "./types";

/**
 * Runs one display-list phase and emits measured timing when tracing is enabled.
 *
 * @param trace - Optional trace sink receiving the measured phase.
 * @param name - Stable phase name shown in diagnostics.
 * @param callback - Work to measure.
 * @returns Callback return value.
 */
export function traceQuireDisplayListPhase<Result>(
  trace: QuireDisplayListOptions["trace"],
  name: string,
  callback: () => Result
): Result {
  if (!trace) {
    return callback();
  }

  const startedAt = readQuireDisplayListTraceTime();

  try {
    return callback();
  } finally {
    const endedAt = readQuireDisplayListTraceTime();
    trace({
      name,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt
    });
  }
}

/**
 * Reads the best monotonic timestamp available to display-list diagnostics.
 *
 * @returns Timestamp in milliseconds.
 */
function readQuireDisplayListTraceTime(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/**
 * Mirrors commands appended since the previous observation checkpoint.
 *
 * @param commands - Mutable display command array being built.
 * @param observer - Optional observer receiving newly appended commands.
 * @param observedCommandCount - Number of commands already reported.
 * @returns Updated number of observed commands.
 */
export function observeNewDisplayCommands(
  commands: readonly QuireDisplayCommand[],
  observer: QuireDisplayListOptions["commandObserver"],
  observedCommandCount: number
): number {
  if (observer === undefined) {
    return commands.length;
  }

  for (let index = observedCommandCount; index < commands.length; index += 1) {
    observer(commands[index]!);
  }

  return commands.length;
}
