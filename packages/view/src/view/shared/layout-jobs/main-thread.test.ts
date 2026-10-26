import { describe, expect, it, vi } from "vitest";
import { createQuireMainThreadLayoutJobExecutor } from "./main-thread";
import { QUIRE_LAYOUT_JOB_PROTOCOL_VERSION } from "./protocol";
import type { QuireLayoutJobRequest } from "./types";

/**
 * Builds one minimal page-window request.
 *
 * @param overrides - Request fields to replace for one assertion.
 * @returns Versioned layout job request.
 */
function request(
  overrides: Partial<QuireLayoutJobRequest> = {}
): QuireLayoutJobRequest {
  return {
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: "paginate:1",
    supersessionScope: "paginate:remainder",
    kind: "remainder-pagination",
    stateVersion: 3,
    layoutEpoch: 2,
    dirtyRange: null,
    window: { kind: "pages", fromIndex: 1, toIndex: 4 },
    cacheHints: {
      retainedBlockKeys: [],
      paginationCheckpointKeys: ["checkpoint:0"],
      tableProductKeys: []
    },
    payload: { checkpointKey: "checkpoint:0" },
    ...overrides
  };
}

describe("main-thread layout job executor", () => {
  it("executes supported work across an asynchronous boundary", async () => {
    const handler = vi.fn(() => ({ pageCount: 3 }));
    const executor = createQuireMainThreadLayoutJobExecutor({
      "remainder-pagination": handler
    });
    const submitted = request();
    const completion = executor.submit(submitted);

    expect(handler).not.toHaveBeenCalled();
    await expect(completion).resolves.toEqual({
      status: "success",
      protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
      jobId: submitted.jobId,
      stateVersion: submitted.stateVersion,
      layoutEpoch: submitted.layoutEpoch,
      output: { pageCount: 3 }
    });
    expect(handler).toHaveBeenCalledWith(submitted);
  });

  it("reports unsupported job kinds without inventing a handler", async () => {
    const executor = createQuireMainThreadLayoutJobExecutor({});

    await expect(executor.submit(request())).resolves.toMatchObject({
      status: "failed",
      code: "unsupported-job-kind"
    });
  });

  it("normalizes handler failures into clone-safe diagnostics", async () => {
    const executor = createQuireMainThreadLayoutJobExecutor({
      "remainder-pagination": () => {
        throw new Error("pagination failed");
      }
    });

    const result = await executor.submit(request());
    expect(result).toMatchObject({
      status: "failed",
      code: "executor-error",
      message: "pagination failed"
    });
    expect(() => structuredClone(result)).not.toThrow();
  });

  it("lets cancellation win over a late handler completion", async () => {
    let finish: ((value: unknown) => void) | undefined;
    const executor = createQuireMainThreadLayoutJobExecutor({
      "remainder-pagination": () => new Promise((resolve) => {
        finish = resolve;
      })
    });
    const submitted = request();
    const completion = executor.submit(submitted);
    await Promise.resolve();

    executor.cancel(submitted.jobId);
    finish?.({ pageCount: 3 });

    await expect(completion).resolves.toMatchObject({ status: "canceled" });
  });

  it("cancels active and future work after destroy", async () => {
    let reject: ((reason: unknown) => void) | undefined;
    const handler = vi.fn(() => new Promise((_resolve, rejectPromise) => {
      reject = rejectPromise;
    }));
    const executor = createQuireMainThreadLayoutJobExecutor({
      "remainder-pagination": handler
    });
    const active = executor.submit(request());
    await Promise.resolve();

    executor.destroy();
    reject?.(new Error("late worker failure"));

    await expect(active).resolves.toMatchObject({ status: "canceled" });
    await expect(executor.submit(request({ jobId: "paginate:2" })))
      .resolves.toMatchObject({ status: "canceled" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
