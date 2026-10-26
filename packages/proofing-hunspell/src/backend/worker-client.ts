import type { HunspellBackend } from "../types";
import type { HunspellWorkerRequest, HunspellWorkerResponse } from "./protocol";

/** Distributes `Omit` over a union so each request keeps its own fields. */
type WithoutId<Request> = Request extends unknown ? Omit<Request, "id"> : never;

/**
 * Talks to a Hunspell worker; the worker answers requests strictly in order.
 *
 * @param worker - Module worker or shared worker running the Hunspell worker entry.
 * @returns Backend forwarding every operation.
 */
export function createWorkerHunspellBackend(worker: Worker | SharedWorker): HunspellBackend {
  const shared = typeof SharedWorker !== "undefined" && worker instanceof SharedWorker;
  const endpoint: Worker | MessagePort = shared ? worker.port : worker as Worker;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let nextId = 0;
  endpoint.addEventListener("message", (event) => {
    const response = (event as MessageEvent<HunspellWorkerResponse>).data;
    const entry = pending.get(response.id);
    if (entry === undefined) return;
    pending.delete(response.id);
    if (response.ok) entry.resolve(response.value);
    else entry.reject(new Error(response.error));
  });
  worker.addEventListener("error", (event) => {
    const message = event instanceof ErrorEvent ? event.message : "unknown error";
    for (const entry of pending.values()) entry.reject(new Error(`Hunspell worker failed: ${message}`));
    pending.clear();
  });

  /**
   * Posts one request.
   *
   * @param request - Request without its identity.
   * @returns Response value.
   */
  const call = <Value>(request: WithoutId<HunspellWorkerRequest>): Promise<Value> => new Promise<Value>((resolve, reject) => {
    nextId += 1;
    pending.set(nextId, { resolve: resolve as (value: unknown) => void, reject });
    endpoint.postMessage({ ...request, id: nextId });
  });

  if (shared) (endpoint as MessagePort).start();

  return {
    has: (key) => call({ type: "has", key }),
    load: (key, source) => call({ type: "load", key, source }),
    unload: (key) => call({ type: "unload", key }),
    check: (key, words) => call({ type: "check", key, words }),
    suggest: (key, word) => call({ type: "suggest", key, word }),
    setUserWords: (words) => call({ type: "set-user-words", words }),
    dispose: () => {
      for (const entry of pending.values()) entry.reject(new Error("Hunspell worker was disposed"));
      pending.clear();
      // A shared worker outlives this tab; only a dedicated one is terminated.
      if (shared) (endpoint as MessagePort).close();
      else (worker as Worker).terminate();
    }
  };
}
