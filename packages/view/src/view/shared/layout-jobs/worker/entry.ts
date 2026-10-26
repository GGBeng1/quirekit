import { handleQuireRemainderPaginationJob } from "../remainder-pagination";
import { bindQuireLayoutWorkerRuntime } from "./runtime";
import type { QuireLayoutWorkerScope } from "./types";

// The emitted module Worker registers only job kinds whose payload and output
// have passed structured-clone parity. It owns computation, never editor state.
bindQuireLayoutWorkerRuntime(self as unknown as QuireLayoutWorkerScope, {
  "remainder-pagination": handleQuireRemainderPaginationJob
});
