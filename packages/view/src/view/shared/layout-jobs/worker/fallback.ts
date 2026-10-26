import { createQuireMainThreadLayoutJobExecutor } from "../main-thread";
import { createQuireCanceledLayoutJobResult } from "../protocol";
import type {
  QuireLayoutJobExecutor,
  QuireLayoutJobRequest,
  QuireLayoutJobResult
} from "../types";
import { createQuireWorkerLayoutJobExecutor } from "./executor";
import type {
  CreateQuireLayoutJobExecutorWithWorkerFallbackOptions,
  QuireLayoutJobExecutorDeployment,
  QuireLayoutJobExecutorDeploymentController,
  QuireLayoutWorkerClient
} from "./types";

/**
 * Selects a real Worker when available and retains one canonical fallback.
 *
 * A transport failure changes only the execution location. The original
 * request is retried through the same clone-safe handler contract, while the
 * coordinator above this executor remains freshness and supersession authority.
 *
 * @param options - Worker factory and shared pure handlers.
 * @returns Executor and observable deployment diagnostics.
 */
export function createQuireLayoutJobExecutorWithWorkerFallback(
  options: CreateQuireLayoutJobExecutorWithWorkerFallbackOptions
): QuireLayoutJobExecutorDeploymentController {
  const fallback = createQuireMainThreadLayoutJobExecutor(options.fallbackHandlers);
  let deployment: QuireLayoutJobExecutorDeployment;
  let active: QuireLayoutJobExecutor;
  let workerExecutor: QuireLayoutJobExecutor | null = null;
  const activeJobIds = new Set<string>();
  const canceledJobIds = new Set<string>();
  let destroyed = false;

  if (options.createWorker === undefined) {
    deployment = { mode: "main-thread", fallbackReason: "worker-unsupported" };
    active = fallback;
  } else {
    let workerClient: QuireLayoutWorkerClient | null = null;
    try {
      workerClient = options.createWorker();
      workerExecutor = createQuireWorkerLayoutJobExecutor(workerClient, {
        onTransportFailure: () => {
          deployment = {
            mode: "main-thread",
            fallbackReason: "worker-transport-failed"
          };
          active = fallback;
        }
      });
      deployment = { mode: "worker", fallbackReason: null };
      active = workerExecutor;
    } catch {
      workerClient?.terminate();
      deployment = {
        mode: "main-thread",
        fallbackReason: "worker-creation-failed"
      };
      active = fallback;
    }
  }

  return {
    executor: {
      async submit(request) {
        if (destroyed) return createQuireCanceledLayoutJobResult(request);
        activeJobIds.add(request.jobId);
        try {
          const submittedTo = active;
          const result = await submittedTo.submit(request);
          if (canceledJobIds.has(request.jobId) || destroyed) {
            return createQuireCanceledLayoutJobResult(request);
          }
          if (
            submittedTo === workerExecutor
            && result.status === "failed"
            && result.code === "transport-error"
          ) {
            return fallback.submit(request);
          }
          return result;
        } finally {
          activeJobIds.delete(request.jobId);
          canceledJobIds.delete(request.jobId);
        }
      },
      cancel(jobId): void {
        if (activeJobIds.has(jobId)) canceledJobIds.add(jobId);
        active.cancel(jobId);
        if (active !== fallback) fallback.cancel(jobId);
      },
      destroy(): void {
        destroyed = true;
        for (const jobId of activeJobIds) canceledJobIds.add(jobId);
        workerExecutor?.destroy();
        fallback.destroy();
      }
    },
    snapshot: () => deployment
  };
}

