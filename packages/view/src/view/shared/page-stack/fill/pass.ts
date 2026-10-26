import type {
  QuirePageStackFillControllerOptions,
  QuirePageStackFillPassRequest,
  QuirePageStackFillPassResult
} from "./types";

/**
 * Reports whether a backend fill result will settle asynchronously.
 *
 * @param result - Immediate or promised backend fill result.
 * @returns Whether the result exposes a promise-like continuation.
 */
function isAsyncFillResult(
  result: QuirePageStackFillPassResult | Promise<QuirePageStackFillPassResult>
): result is Promise<QuirePageStackFillPassResult> {
  return typeof (result as PromiseLike<QuirePageStackFillPassResult>).then === "function";
}

/**
 * Executes a backend pass without forcing synchronous backends through a microtask.
 *
 * @param request - Canonical block window to execute.
 * @param executePass - Backend shaping or materialization strategy.
 * @param onResult - Continuation receiving the settled backend decision.
 */
export function executePageStackFillPass(
  request: QuirePageStackFillPassRequest,
  executePass: QuirePageStackFillControllerOptions["executePass"],
  onResult: (result: QuirePageStackFillPassResult) => void
): void {
  const result = executePass(request);
  if (isAsyncFillResult(result)) {
    void result.then(onResult);
    return;
  }

  onResult(result);
}
