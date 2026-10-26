import { createQuireMainThreadLayoutJobExecutor } from "../main-thread";
import type { QuireMainThreadLayoutJobHandlers } from "../types";
import type {
  QuireLayoutWorkerRequestMessage,
  QuireLayoutWorkerRuntime,
  QuireLayoutWorkerScope
} from "./types";

/**
 * Binds pure layout handlers to a Worker-global message endpoint.
 *
 * @param scope - Worker-global endpoint.
 * @param handlers - Pure clone-safe job handlers available in this artifact.
 * @returns Worker runtime lifecycle.
 */
export function bindQuireLayoutWorkerRuntime(
  scope: QuireLayoutWorkerScope,
  handlers: QuireMainThreadLayoutJobHandlers
): QuireLayoutWorkerRuntime {
  const executor = createQuireMainThreadLayoutJobExecutor(handlers);
  let destroyed = false;
  const listener = (event: { readonly data: unknown }): void => {
    const message = event.data;
    if (!isWorkerRequestMessage(message) || destroyed) {
      return;
    }
    if (message.type === "cancel") {
      executor.cancel(message.jobId);
      return;
    }
    void executor.submit(message.request).then((result) => {
      if (!destroyed) {
        scope.postMessage({ type: "result", result });
      }
    });
  };
  scope.addEventListener("message", listener);

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      scope.removeEventListener("message", listener);
      executor.destroy();
    }
  };
}

/** @param value - Unknown message. @returns Whether it is a supported request. */
function isWorkerRequestMessage(value: unknown): value is QuireLayoutWorkerRequestMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  if (value.type === "cancel") return "jobId" in value && typeof value.jobId === "string";
  return value.type === "submit" && "request" in value
    && typeof value.request === "object" && value.request !== null;
}
