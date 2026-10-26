import { describe, expect, it, vi } from "vitest";
import { createQuireLayoutJobCoordinator } from "./coordinator";
import { QUIRE_LAYOUT_JOB_PROTOCOL_VERSION } from "./protocol";
import type {
  QuireLayoutJobExecutor,
  QuireLayoutJobRequest,
  QuireLayoutJobResult
} from "./types";

/** Promise controller used to complete executor work in an exact order. */
interface DeferredResult {
  /** Job result promise returned by the fake executor. */
  readonly promise: Promise<QuireLayoutJobResult>;
  /** Completes the fake executor result. */
  readonly resolve: (result: QuireLayoutJobResult) => void;
}

/**
 * Creates a deferred result promise.
 *
 * @returns Deferred result controller.
 */
function deferredResult(): DeferredResult {
  let resolve: ((result: QuireLayoutJobResult) => void) | undefined;
  const promise = new Promise<QuireLayoutJobResult>((complete) => {
    resolve = complete;
  });
  return {
    promise,
    resolve(result: QuireLayoutJobResult): void {
      resolve?.(result);
    }
  };
}

/**
 * Builds one minimal shaping request.
 *
 * @param overrides - Request fields to replace for one assertion.
 * @returns Versioned layout job request.
 */
function request(
  overrides: Partial<QuireLayoutJobRequest> = {}
): QuireLayoutJobRequest {
  return {
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: "shape:1",
    supersessionScope: "shape:background",
    kind: "background-shaping",
    stateVersion: 5,
    layoutEpoch: 3,
    dirtyRange: null,
    window: { kind: "blocks", fromIndex: 4, toIndex: 12 },
    cacheHints: {
      retainedBlockKeys: ["block:0"],
      paginationCheckpointKeys: [],
      tableProductKeys: []
    },
    payload: { blockKeys: ["block:4"] },
    ...overrides
  };
}

/**
 * Builds a successful result echoing request identity.
 *
 * @param source - Request whose identity should be echoed.
 * @param output - Optional job output.
 * @returns Successful executor result.
 */
function success(
  source: QuireLayoutJobRequest,
  output: unknown = { shapedBlockKeys: ["block:4"] }
): QuireLayoutJobResult {
  return {
    status: "success",
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: source.jobId,
    stateVersion: source.stateVersion,
    layoutEpoch: source.layoutEpoch,
    output
  };
}

/**
 * Creates a controllable executor that records cancellation.
 *
 * @returns Executor, cancellation spy, destroy spy, and queued results.
 */
function controlledExecutor(): {
  readonly executor: QuireLayoutJobExecutor;
  readonly cancel: ReturnType<typeof vi.fn>;
  readonly destroy: ReturnType<typeof vi.fn>;
  readonly pending: DeferredResult[];
} {
  const pending: DeferredResult[] = [];
  const cancel = vi.fn();
  const destroy = vi.fn();
  return {
    executor: {
      submit: () => {
        const deferred = deferredResult();
        pending.push(deferred);
        return deferred.promise;
      },
      cancel,
      destroy
    },
    cancel,
    destroy,
    pending
  };
}

describe("layout job coordinator", () => {
  it("accepts only a successful result for the current mounted revision", async () => {
    const runtime = controlledExecutor();
    const coordinator = createQuireLayoutJobCoordinator({
      executor: runtime.executor,
      readCurrentRevision: () => ({ stateVersion: 5, layoutEpoch: 3 })
    });
    const submitted = request();
    const completion = coordinator.submit(submitted);
    runtime.pending[0]!.resolve(success(submitted));

    await expect(completion).resolves.toEqual({
      accepted: true,
      result: success(submitted)
    });
    expect(coordinator.snapshot()).toMatchObject({
      submitted: 1,
      completed: 1,
      accepted: 1
    });
  });

  it("rejects stale state and layout revisions independently", async () => {
    let revision = { stateVersion: 6, layoutEpoch: 3 };
    const runtime = controlledExecutor();
    const coordinator = createQuireLayoutJobCoordinator({
      executor: runtime.executor,
      readCurrentRevision: () => revision
    });
    const staleStateRequest = request();
    const staleState = coordinator.submit(staleStateRequest);
    runtime.pending[0]!.resolve(success(staleStateRequest));
    await expect(staleState).resolves.toMatchObject({
      accepted: false,
      reason: "stale-state"
    });

    revision = { stateVersion: 5, layoutEpoch: 4 };
    const staleLayoutRequest = request({ jobId: "shape:2" });
    const staleLayout = coordinator.submit(staleLayoutRequest);
    runtime.pending[1]!.resolve(success(staleLayoutRequest));
    await expect(staleLayout).resolves.toMatchObject({
      accepted: false,
      reason: "stale-layout"
    });

    expect(coordinator.snapshot()).toMatchObject({
      staleStateResults: 1,
      staleLayoutResults: 1,
      accepted: 0
    });
  });

  it("cancels older work and rejects a late result from the same scope", async () => {
    const runtime = controlledExecutor();
    const coordinator = createQuireLayoutJobCoordinator({
      executor: runtime.executor,
      readCurrentRevision: () => ({ stateVersion: 5, layoutEpoch: 3 })
    });
    const firstRequest = request();
    const secondRequest = request({ jobId: "shape:2" });
    const first = coordinator.submit(firstRequest);
    const second = coordinator.submit(secondRequest);

    expect(runtime.cancel).toHaveBeenCalledWith(firstRequest.jobId);
    runtime.pending[1]!.resolve(success(secondRequest));
    runtime.pending[0]!.resolve(success(firstRequest));

    await expect(second).resolves.toMatchObject({ accepted: true });
    await expect(first).resolves.toMatchObject({
      accepted: false,
      reason: "superseded"
    });
    expect(coordinator.snapshot()).toMatchObject({
      submitted: 2,
      completed: 2,
      accepted: 1,
      cancellationRequests: 1,
      supersededResults: 1
    });
  });

  it("rejects protocol, identity, canceled, and failed results explicitly", async () => {
    const runtime = controlledExecutor();
    const coordinator = createQuireLayoutJobCoordinator({
      executor: runtime.executor,
      readCurrentRevision: () => ({ stateVersion: 5, layoutEpoch: 3 })
    });
    const cases: readonly {
      readonly jobId: string;
      readonly result: (source: QuireLayoutJobRequest) => QuireLayoutJobResult;
      readonly reason: string;
    }[] = [
      {
        jobId: "shape:protocol",
        result: (source) => ({ ...success(source), protocolVersion: 99 }),
        reason: "protocol-mismatch"
      },
      {
        jobId: "shape:identity",
        result: (source) => ({ ...success(source), jobId: "shape:wrong" }),
        reason: "invalid-result"
      },
      {
        jobId: "shape:canceled",
        result: (source) => ({
          status: "canceled",
          protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
          jobId: source.jobId,
          stateVersion: source.stateVersion,
          layoutEpoch: source.layoutEpoch
        }),
        reason: "canceled"
      },
      {
        jobId: "shape:failed",
        result: (source) => ({
          status: "failed",
          protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
          jobId: source.jobId,
          stateVersion: source.stateVersion,
          layoutEpoch: source.layoutEpoch,
          code: "executor-error",
          message: "failed"
        }),
        reason: "failed"
      }
    ];

    for (const entry of cases) {
      const submitted = request({
        jobId: entry.jobId,
        supersessionScope: entry.jobId
      });
      const completion = coordinator.submit(submitted);
      runtime.pending.at(-1)!.resolve(entry.result(submitted));
      await expect(completion).resolves.toMatchObject({
        accepted: false,
        reason: entry.reason
      });
    }

    expect(coordinator.snapshot()).toMatchObject({
      protocolMismatches: 1,
      invalidResults: 1,
      canceled: 1,
      failed: 1
    });
  });

  it("cancels active work and rejects late completion after destroy", async () => {
    const runtime = controlledExecutor();
    const coordinator = createQuireLayoutJobCoordinator({
      executor: runtime.executor,
      readCurrentRevision: () => ({ stateVersion: 5, layoutEpoch: 3 })
    });
    const submitted = request();
    const completion = coordinator.submit(submitted);

    coordinator.destroy();
    coordinator.destroy();
    runtime.pending[0]!.resolve(success(submitted));

    await expect(completion).resolves.toMatchObject({
      accepted: false,
      reason: "destroyed"
    });
    expect(runtime.cancel).toHaveBeenCalledTimes(1);
    expect(runtime.destroy).toHaveBeenCalledTimes(1);
    expect(coordinator.snapshot()).toMatchObject({
      cancellationRequests: 1,
      destroyedResults: 1
    });
  });
});
