import type {
  QuireLayoutWorkerClient,
  QuireLayoutWorkerErrorEvent,
  QuireLayoutWorkerMessageEvent
} from "./types";

/**
 * Adapts browser Worker overloads to the minimal layout transport capability.
 *
 * @param worker - Browser module Worker created by the host bundler.
 * @returns Transport endpoint consumed by layout execution.
 */
export function adaptQuireBrowserLayoutWorker(worker: Worker): QuireLayoutWorkerClient {
  /** @param type - Worker event type. @param listener - Layout transport listener. */
  const addEventListener = (
    type: "message" | "error" | "messageerror",
    listener: (
      event: QuireLayoutWorkerMessageEvent<unknown> | QuireLayoutWorkerErrorEvent
    ) => void
  ): void => worker.addEventListener(type, listener as EventListener);
  /** @param type - Worker event type. @param listener - Prior transport listener. */
  const removeEventListener = (
    type: "message" | "error" | "messageerror",
    listener: (
      event: QuireLayoutWorkerMessageEvent<unknown> | QuireLayoutWorkerErrorEvent
    ) => void
  ): void => worker.removeEventListener(type, listener as EventListener);
  return {
    postMessage: (message) => worker.postMessage(message),
    addEventListener: addEventListener as QuireLayoutWorkerClient["addEventListener"],
    removeEventListener: removeEventListener as QuireLayoutWorkerClient["removeEventListener"],
    terminate: () => worker.terminate()
  };
}
