import { createQuireCanceledLayoutJobResult, QUIRE_LAYOUT_JOB_PROTOCOL_VERSION } from "../protocol";
import type {
  QuireLayoutJobExecutor,
  QuireLayoutJobRequest,
  QuireLayoutJobResult
} from "../types";
import type {
  QuireLayoutWorkerClient,
  QuireLayoutWorkerErrorEvent,
  QuireLayoutWorkerResultMessage
} from "./types";

/** Worker executor lifecycle hooks owned by a deployment controller. */
export interface QuireWorkerLayoutJobExecutorOptions {
  /** @param message - Transport failure detail. */
  readonly onTransportFailure?: (message: string) => void;
}

/** Pending Worker request resolution. */
interface PendingWorkerRequest {
  /** Submitted request used for deterministic teardown cancellation. */
  readonly request: QuireLayoutJobRequest;
  /** Resolves the executor submission. */
  readonly resolve: (result: QuireLayoutJobResult) => void;
}

/**
 * Creates a layout-job executor over a real or test Worker endpoint.
 *
 * @param worker - Main-thread Worker endpoint.
 * @param options - Optional transport lifecycle observer.
 * @returns Executor preserving the generic coordinator contract.
 */
export function createQuireWorkerLayoutJobExecutor(
  worker: QuireLayoutWorkerClient,
  options: QuireWorkerLayoutJobExecutorOptions = {}
): QuireLayoutJobExecutor {
  const pending = new Map<string, PendingWorkerRequest>();
  let destroyed = false;
  const listener = (event: { readonly data: unknown }): void => {
    if (!isWorkerResultMessage(event.data)) return;
    const active = pending.get(event.data.result.jobId);
    if (active === undefined) return;
    pending.delete(event.data.result.jobId);
    active.resolve(event.data.result);
  };
  const failureListener = (event: QuireLayoutWorkerErrorEvent): void => {
    if (destroyed) return;
    destroyed = true;
    const message = event.message ?? "Layout Worker transport failed.";
    worker.removeEventListener("message", listener);
    worker.removeEventListener("error", failureListener);
    worker.removeEventListener("messageerror", failureListener);
    for (const active of pending.values()) {
      active.resolve(transportFailedResult(active.request, message));
    }
    pending.clear();
    worker.terminate();
    options.onTransportFailure?.(message);
  };
  worker.addEventListener("message", listener);
  worker.addEventListener("error", failureListener);
  worker.addEventListener("messageerror", failureListener);

  return {
    submit(request) {
      if (destroyed) return Promise.resolve(createQuireCanceledLayoutJobResult(request));
      return new Promise((resolve) => {
        pending.set(request.jobId, { request, resolve });
        try {
          worker.postMessage({ type: "submit", request });
        } catch (error) {
          failureListener({
            message: error instanceof Error ? error.message : String(error)
          });
        }
      });
    },
    cancel(jobId): void {
      if (pending.has(jobId)) worker.postMessage({ type: "cancel", jobId });
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      worker.removeEventListener("message", listener);
      worker.removeEventListener("error", failureListener);
      worker.removeEventListener("messageerror", failureListener);
      for (const active of pending.values()) active.resolve(createQuireCanceledLayoutJobResult(active.request));
      pending.clear();
      worker.terminate();
    }
  };
}

/**
 * Creates a clone-safe transport failure result.
 *
 * @param request - Request abandoned by the failed Worker.
 * @param message - Browser-provided transport detail.
 * @returns Failed result eligible for deployment-level retry.
 */
function transportFailedResult(
  request: QuireLayoutJobRequest,
  message: string
): QuireLayoutJobResult {
  return {
    status: "failed",
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: request.jobId,
    stateVersion: request.stateVersion,
    layoutEpoch: request.layoutEpoch,
    code: "transport-error",
    message
  };
}

/** @param value - Unknown message. @returns Whether it carries a layout result. */
function isWorkerResultMessage(value: unknown): value is QuireLayoutWorkerResultMessage {
  return typeof value === "object" && value !== null && "type" in value
    && value.type === "result" && "result" in value
    && typeof value.result === "object" && value.result !== null
    && "jobId" in value.result && typeof value.result.jobId === "string"
    && "status" in value.result
    && (value.result.status === "success" || value.result.status === "canceled"
      || value.result.status === "failed");
}

