import { describe, expect, it } from "vitest";
import type {
  ClassicEditorHostAcquireResult,
  ClassicEditorHostJobProgress,
  ClassicEditorHostProgressReporter
} from "../../types/host";
import { ClassicEditorHostResourceCoordinator } from "./coordinator";
import {
  createHostTestAcquireIntent,
  createHostTestDeferred,
  createHostTestServices
} from "./test-fixtures";

describe("Classic Editor Host progress and lifecycle", () => {
  it("accepts only correlated monotonic pending progress", async () => {
    const deferred = createHostTestDeferred<ClassicEditorHostAcquireResult>();
    let reporter: ClassicEditorHostProgressReporter | undefined;
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({
        acquire: (request) => {
          reporter = request.progress;
          return deferred.promise;
        }
      })
    );
    const intent = createHostTestAcquireIntent();
    const pending = coordinator.start(intent);

    expect(coordinator.snapshot?.progress).toEqual({
      phase: "acquiring",
      completedBytes: 0,
      totalBytes: null,
      attempt: 0,
      canCancel: true
    });
    report(reporter, {
      phase: "acquiring", completedBytes: 5, totalBytes: 10,
      attempt: 0, canCancel: true
    });
    expect(coordinator.snapshot?.progress.completedBytes).toBe(5);

    const rejected: readonly ClassicEditorHostJobProgress[] = [
      { phase: "resolving", completedBytes: 6, totalBytes: 10, attempt: 0, canCancel: true },
      { phase: "acquiring", completedBytes: 6, totalBytes: 10, attempt: 1, canCancel: true },
      { phase: "acquiring", completedBytes: 4, totalBytes: 10, attempt: 0, canCancel: true },
      { phase: "acquiring", completedBytes: 11, totalBytes: 10, attempt: 0, canCancel: true },
      { phase: "acquiring", completedBytes: 6, totalBytes: 12, attempt: 0, canCancel: true }
    ];
    for (const candidate of rejected) report(reporter, candidate);
    expect(coordinator.snapshot?.progress.completedBytes).toBe(5);

    report(reporter, {
      phase: "acquiring", completedBytes: 6, totalBytes: 10,
      attempt: 0, canCancel: false
    });
    expect(coordinator.snapshot?.progress).toMatchObject({
      completedBytes: 6,
      canCancel: false
    });
    report(reporter, {
      phase: "acquiring", completedBytes: 7, totalBytes: 10,
      attempt: 0, canCancel: true
    });
    expect(coordinator.snapshot?.progress).toMatchObject({
      completedBytes: 6,
      canCancel: false
    });

    deferred.resolve(cancelled(intent));
    await pending;
    report(reporter, {
      phase: "acquiring", completedBytes: 10, totalBytes: 10,
      attempt: 0, canCancel: false
    });
    expect(coordinator.snapshot?.progress).toMatchObject({
      phase: "result",
      completedBytes: 6,
      canCancel: false
    });
  });

  it("aborts pending work on destroy and rejects future starts or retries", async () => {
    const deferred = createHostTestDeferred<ClassicEditorHostAcquireResult>();
    let signal: AbortSignal | undefined;
    const coordinator = new ClassicEditorHostResourceCoordinator(
      createHostTestServices({
        acquire: (request) => {
          signal = request.signal;
          return deferred.promise;
        }
      })
    );
    const intent = createHostTestAcquireIntent();
    const pending = coordinator.start(intent);

    coordinator.destroy();
    coordinator.destroy();
    expect(signal?.aborted).toBe(true);
    expect(coordinator.snapshot?.result?.outcome).toBe("cancelled");
    await expect(coordinator.start(intent)).rejects.toThrow(/destroyed/u);
    await expect(coordinator.retry(intent)).rejects.toThrow(/destroyed/u);

    deferred.resolve(cancelled(intent));
    await expect(pending).resolves.toBeNull();
    expect(coordinator.snapshot?.result?.outcome).toBe("cancelled");
  });
});

/**
 * Reports through a fixture channel that must have been installed synchronously.
 *
 * @param reporter - Captured progress reporter.
 * @param progress - Candidate progress snapshot.
 */
function report(
  reporter: ClassicEditorHostProgressReporter | undefined,
  progress: ClassicEditorHostJobProgress
): void {
  if (reporter === undefined) throw new Error("Host progress reporter was not installed.");
  reporter.report(progress);
}

/**
 * Creates a correlated cancellation result.
 *
 * @param intent - Acquire intent to correlate.
 * @returns Matching cancellation result.
 */
function cancelled(
  intent: ReturnType<typeof createHostTestAcquireIntent>
): ClassicEditorHostAcquireResult {
  return {
    kind: "acquire",
    jobId: intent.jobId,
    operationId: intent.operationId,
    attempt: intent.attempt,
    generation: intent.generation,
    outcome: "cancelled"
  };
}
