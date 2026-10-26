import { createInlineHunspellBackend } from "./backend/inline";
import { HunspellWorkerHost, type HunspellWorkerEndpoint } from "./backend/host";

/** Dictionaries a worker keeps loaded; tabs sharing it reload an evicted one on demand. */
const maxWorkerDictionaries = 8;

/** Worker entry for both a dedicated `Worker` and a `SharedWorker`. */
const host = new HunspellWorkerHost(createInlineHunspellBackend(maxWorkerDictionaries));
const scope = self as unknown as {
  readonly onconnect?: unknown;
  addEventListener(type: "connect", listener: (event: MessageEvent) => void): void;
};

if ("onconnect" in scope) {
  scope.addEventListener("connect", (event) => {
    const port = event.ports[0]!;
    host.serve(port as unknown as HunspellWorkerEndpoint);
    port.start();
  });
} else {
  host.serve(self as unknown as HunspellWorkerEndpoint);
}
