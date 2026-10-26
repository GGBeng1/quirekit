import type { HunspellBackend } from "../types";
import type { HunspellWorkerRequest, HunspellWorkerResponse } from "./protocol";

/** Message endpoint served by the host: a dedicated worker scope or one shared-worker port. */
export interface HunspellWorkerEndpoint {
  /**
   * Sends a response.
   *
   * @param message - Response.
   */
  postMessage(message: HunspellWorkerResponse): void;
  /**
   * Subscribes to requests.
   *
   * @param type - Event type.
   * @param listener - Request listener.
   */
  addEventListener(type: "message", listener: (event: MessageEvent<HunspellWorkerRequest>) => void): void;
}

/** One Hunspell backend serving any number of connections. */
export class HunspellWorkerHost {
  private queue: Promise<void> = Promise.resolve();
  private readonly words = new Map<HunspellWorkerEndpoint, readonly string[]>();

  /** @param backend - Backend shared by every connection. */
  constructor(private readonly backend: HunspellBackend) {}

  /**
   * Answers the requests of one connection.
   *
   * Requests from all connections run strictly in arrival order, so a check
   * never runs against a dictionary that is still loading.
   *
   * @param endpoint - Connection endpoint.
   */
  serve(endpoint: HunspellWorkerEndpoint): void {
    endpoint.addEventListener("message", (event) => {
      const request = event.data;
      this.queue = this.queue.then(async () => {
        let response: HunspellWorkerResponse;
        try {
          response = { id: request.id, ok: true, value: await this.execute(endpoint, request) };
        } catch (error) {
          response = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        endpoint.postMessage(response);
      });
    });
  }

  /**
   * Executes one request.
   *
   * @param endpoint - Requesting connection.
   * @param request - Worker request.
   * @returns Response value.
   */
  private async execute(endpoint: HunspellWorkerEndpoint, request: HunspellWorkerRequest): Promise<unknown> {
    switch (request.type) {
      case "has": return this.backend.has(request.key);
      case "load": return this.backend.load(request.key, request.source);
      case "unload": return this.backend.unload(request.key);
      case "check": return this.backend.check(request.key, request.words);
      case "suggest": return this.backend.suggest(request.key, request.word);
      case "set-user-words": {
        // Each tab keeps its own user words; the shared instances accept all of them.
        this.words.set(endpoint, request.words);
        return this.backend.setUserWords([...new Set([...this.words.values()].flat())]);
      }
    }
  }
}
