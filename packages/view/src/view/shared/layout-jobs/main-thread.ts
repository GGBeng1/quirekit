import { createQuireCanceledLayoutJobResult, QUIRE_LAYOUT_JOB_PROTOCOL_VERSION } from "./protocol";
import { QuireLayoutJobExecutionError } from "./errors";
import type {
  QuireLayoutJobExecutor,
  QuireLayoutJobFailedResult,
  QuireLayoutJobRequest,
  QuireLayoutJobResult,
  QuireMainThreadLayoutJobHandlers
} from "./types";

/**
 * Creates the asynchronous main-thread fallback for versioned layout jobs.
 *
 * Handlers receive the same clone-safe envelope a Worker would receive. The
 * fallback deliberately schedules through a promise boundary so cancellation
 * and stale-result tests exercise the same coordinator path.
 *
 * @param handlers - Explicit handlers for supported job kinds.
 * @returns Main-thread job executor.
 */
export function createQuireMainThreadLayoutJobExecutor(
  handlers: QuireMainThreadLayoutJobHandlers
): QuireLayoutJobExecutor {
  const canceled = new Set<string>();
  const active = new Set<string>();
  let destroyed = false;

  return {
    async submit(request: QuireLayoutJobRequest): Promise<QuireLayoutJobResult> {
      active.add(request.jobId);
      try {
        await Promise.resolve();
        if (destroyed || canceled.has(request.jobId)) {
          return createQuireCanceledLayoutJobResult(request);
        }
        const handler = handlers[request.kind];
        if (handler === undefined) {
          return failedResult(
            request,
            "unsupported-job-kind",
            `No main-thread handler registered for layout job kind "${request.kind}".`
          );
        }
        const output = await handler(request);
        if (destroyed || canceled.has(request.jobId)) {
          return createQuireCanceledLayoutJobResult(request);
        }
        return {
          status: "success",
          protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
          jobId: request.jobId,
          stateVersion: request.stateVersion,
          layoutEpoch: request.layoutEpoch,
          output
        };
      } catch (error) {
        if (destroyed || canceled.has(request.jobId)) {
          return createQuireCanceledLayoutJobResult(request);
        }
        if (error instanceof QuireLayoutJobExecutionError) {
          return failedResult(request, error.code, error.message);
        }
        return failedResult(request, "executor-error", errorMessage(error));
      } finally {
        active.delete(request.jobId);
        canceled.delete(request.jobId);
      }
    },
    cancel(jobId: string): void {
      if (active.has(jobId)) {
        canceled.add(jobId);
      }
    },
    destroy(): void {
      destroyed = true;
      for (const jobId of active) {
        canceled.add(jobId);
      }
    }
  };
}

/**
 * Creates a failed result echoing one request identity.
 *
 * @param request - Failed request.
 * @param code - Stable failure code.
 * @param message - Human-readable failure detail.
 * @returns Clone-safe failed result.
 */
function failedResult(
  request: QuireLayoutJobRequest,
  code: QuireLayoutJobFailedResult["code"],
  message: string
): QuireLayoutJobResult {
  return {
    status: "failed",
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: request.jobId,
    stateVersion: request.stateVersion,
    layoutEpoch: request.layoutEpoch,
    code,
    message
  };
}

/**
 * Normalizes an unknown thrown value for clone-safe diagnostics.
 *
 * @param error - Thrown handler value.
 * @returns Human-readable error message.
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
