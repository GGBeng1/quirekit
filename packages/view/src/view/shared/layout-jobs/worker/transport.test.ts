import { describe, expect, it } from "vitest";
import { createQuireWorkerLayoutJobExecutor } from "./executor";
import { createQuireLayoutJobExecutorWithWorkerFallback } from "./fallback";
import { bindQuireLayoutWorkerRuntime } from "./runtime";
import type {
  QuireLayoutWorkerClient,
  QuireLayoutWorkerErrorEvent,
  QuireLayoutWorkerMessageEvent,
  QuireLayoutWorkerScope
} from "./types";
import type { QuireLayoutJobRequest } from "../types";

describe("layout Worker transport", () => {
  it("round-trips pure job output through message endpoints", async () => {
    const channel = createMemoryWorkerChannel();
    const runtime = bindQuireLayoutWorkerRuntime(channel.scope, {
      "remainder-pagination": (request) => ({ echoed: request.payload })
    });
    const executor = createQuireWorkerLayoutJobExecutor(channel.client);

    await expect(executor.submit(request("job:1"))).resolves.toMatchObject({
      status: "success",
      jobId: "job:1",
      output: { echoed: { value: 1 } }
    });
    executor.destroy();
    runtime.destroy();
  });

  it("settles pending requests as canceled on teardown", async () => {
    const channel = createMemoryWorkerChannel();
    const executor = createQuireWorkerLayoutJobExecutor(channel.client);
    const completion = executor.submit(request("job:pending"));
    executor.destroy();

    await expect(completion).resolves.toMatchObject({
      status: "canceled",
      jobId: "job:pending"
    });
    expect(channel.terminated).toBe(true);
  });

  it("selects the canonical fallback when Worker creation fails", async () => {
    const deployment = createQuireLayoutJobExecutorWithWorkerFallback({
      createWorker: () => {
        throw new Error("blocked by policy");
      },
      fallbackHandlers: {
        "remainder-pagination": (submitted) => ({ echoed: submitted.payload })
      }
    });

    expect(deployment.snapshot()).toEqual({
      mode: "main-thread",
      fallbackReason: "worker-creation-failed"
    });
    await expect(
      deployment.executor.submit(request("job:fallback"))
    ).resolves.toMatchObject({ status: "success", output: { echoed: { value: 1 } } });
    deployment.executor.destroy();
  });

  it("retries an interrupted Worker request through the shared fallback", async () => {
    const channel = createMemoryWorkerChannel();
    const deployment = createQuireLayoutJobExecutorWithWorkerFallback({
      createWorker: () => channel.client,
      fallbackHandlers: {
        "remainder-pagination": (submitted) => ({ fallback: submitted.payload })
      }
    });
    const completion = deployment.executor.submit(request("job:transport-fallback"));
    channel.fail("module failed to load");

    await expect(completion).resolves.toMatchObject({
      status: "success",
      output: { fallback: { value: 1 } }
    });
    expect(deployment.snapshot()).toEqual({
      mode: "main-thread",
      fallbackReason: "worker-transport-failed"
    });
    deployment.executor.destroy();
  });

  it("does not revive a canceled request while transport fallback is switching", async () => {
    const channel = createMemoryWorkerChannel();
    const deployment = createQuireLayoutJobExecutorWithWorkerFallback({
      createWorker: () => channel.client,
      fallbackHandlers: {
        "remainder-pagination": () => ({ shouldNotAttach: true })
      }
    });
    const completion = deployment.executor.submit(request("job:canceled-transition"));
    channel.fail("module failed to load");
    deployment.executor.cancel("job:canceled-transition");

    await expect(completion).resolves.toMatchObject({
      status: "canceled",
      jobId: "job:canceled-transition"
    });
    deployment.executor.destroy();
  });
});

/** @param jobId - Unique test job id. @returns Clone-safe pagination request. */
function request(jobId: string): QuireLayoutJobRequest {
  return {
    protocolVersion: 1,
    jobId,
    supersessionScope: "pagination",
    kind: "remainder-pagination",
    stateVersion: 1,
    layoutEpoch: 1,
    dirtyRange: null,
    window: { kind: "pages", fromIndex: 0, toIndex: 1 },
    cacheHints: {
      retainedBlockKeys: [],
      paginationCheckpointKeys: [],
      tableProductKeys: []
    },
    payload: { value: 1 }
  };
}

/** @returns In-memory main/Worker endpoints with asynchronous delivery. */
function createMemoryWorkerChannel(): {
  readonly client: QuireLayoutWorkerClient;
  readonly scope: QuireLayoutWorkerScope;
  readonly terminated: boolean;
  /** @param message - Simulated asynchronous Worker failure. */
  readonly fail: (message: string) => void;
} {
  const clientListeners = new Set<(
    event: QuireLayoutWorkerMessageEvent<unknown>
  ) => void>();
  const errorListeners = new Set<(event: QuireLayoutWorkerErrorEvent) => void>();
  const scopeListeners = new Set<(event: QuireLayoutWorkerMessageEvent<unknown>) => void>();
  let terminated = false;
  return {
    client: {
      postMessage: (message) => queueMicrotask(() => {
        for (const listener of scopeListeners) listener({ data: structuredClone(message) });
      }),
      addEventListener: (type, listener) => {
        if (type === "message") {
          clientListeners.add(listener as (event: QuireLayoutWorkerMessageEvent<unknown>) => void);
        } else {
          errorListeners.add(listener as (event: QuireLayoutWorkerErrorEvent) => void);
        }
      },
      removeEventListener: (type, listener) => {
        if (type === "message") {
          clientListeners.delete(listener as (
            event: QuireLayoutWorkerMessageEvent<unknown>
          ) => void);
        } else {
          errorListeners.delete(listener as (event: QuireLayoutWorkerErrorEvent) => void);
        }
      },
      terminate: () => { terminated = true; }
    },
    scope: {
      postMessage: (message) => queueMicrotask(() => {
        for (const listener of clientListeners) listener({ data: structuredClone(message) });
      }),
      addEventListener: (_type, listener) => scopeListeners.add(listener),
      removeEventListener: (_type, listener) => scopeListeners.delete(listener)
    },
    fail: (message) => {
      for (const listener of errorListeners) listener({ message });
    },
    get terminated() { return terminated; }
  };
}
