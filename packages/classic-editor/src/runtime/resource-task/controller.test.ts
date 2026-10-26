import { describe, expect, it } from "vitest";
import type {
  ClassicEditorHostResourceTaskAttempt,
  ClassicEditorHostResourceTaskResult
} from "../../types";
import { ClassicEditorHostResourceCoordinator } from "../host-resource/coordinator";
import { createHostTestServices } from "../host-resource/test-fixtures";
import { ClassicEditorTaskFeedbackRuntime } from "../tasks";
import { ClassicEditorHostResourceTaskRuntime } from "./controller";

describe("Classic Editor Host resource tasks", () => {
  it("runs different task identities concurrently and commits independently", async () => {
    const runtime = createRuntime();
    const left = createDeferred<void>();
    const right = createDeferred<void>();
    const committed: string[] = [];
    const leftPending = runtime.resources.startResource({
      taskId: "picture-left",
      purpose: "image",
      phase: "choosing",
      run: async (attempt) => {
        await left.promise;
        const result = attempt.commit(() => {
          committed.push("left");
          return true;
        });
        return result ? { outcome: "success" } : failure("fixture.left");
      }
    });
    const rightPending = runtime.resources.startResource({
      taskId: "picture-right",
      purpose: "image",
      phase: "processing",
      run: async (attempt) => {
        await right.promise;
        const result = attempt.commit(() => {
          committed.push("right");
          return true;
        });
        return result ? { outcome: "success" } : failure("fixture.right");
      }
    });

    expect(runtime.tasks.snapshot.tasks.map((task) => task.taskId)).toEqual([
      "picture-left",
      "picture-right"
    ]);
    expect(runtime.tasks.snapshot.tasks[0]).toMatchObject({
      kind: "host",
      hostPurpose: "image",
      phase: "choosing"
    });
    right.resolve();
    await expect(rightPending).resolves.toEqual({ outcome: "success" });
    left.resolve();
    await expect(leftPending).resolves.toEqual({ outcome: "success" });
    expect(committed).toEqual(["right", "left"]);
  });

  it("aborts cancellation and rejects late progress, commit, and settlement", async () => {
    const runtime = createRuntime();
    const deferred = createDeferred<void>();
    let attempt: ClassicEditorHostResourceTaskAttempt | undefined;
    let commits = 0;
    const pending = runtime.resources.startResource({
      taskId: "picture-cancel",
      purpose: "image",
      phase: "processing",
      run: async (current) => {
        attempt = current;
        await deferred.promise;
        current.update({ phase: "uploading" });
        current.commit(() => {
          commits += 1;
          return true;
        });
        return { outcome: "success" };
      }
    });

    expect(runtime.resources.cancel("picture-cancel")).toBe(true);
    expect(attempt?.signal.aborted).toBe(true);
    deferred.resolve();
    await expect(pending).resolves.toEqual({ outcome: "cancelled" });
    expect(commits).toBe(0);
    expect(readPhase(runtime.tasks, "picture-cancel")).toBe("cancelled");
  });

  it("creates a fresh retry generation and excludes cancellation during commit", async () => {
    const runtime = createRuntime();
    const retryGate = createDeferred<void>();
    const attempts: ClassicEditorHostResourceTaskAttempt[] = [];
    let commits = 0;
    const initial = await runtime.resources.startResource({
      taskId: "picture-retry",
      purpose: "image",
      phase: "processing",
      run: async (attempt) => {
        attempts.push(attempt);
        if (attempts.length === 1) return failure("fixture.retry", true);
        await retryGate.promise;
        const committed = attempt.commit(() => {
          expect(runtime.resources.cancel("picture-retry")).toBe(false);
          commits += 1;
          return true;
        });
        return committed ? { outcome: "success" } : failure("fixture.commit");
      }
    });

    expect(initial.outcome).toBe("failed");
    expect(runtime.resources.retry("picture-retry")).toBe(true);
    expect(attempts).toHaveLength(2);
    expect(attempts[1]?.handle.generation).toBe((attempts[0]?.handle.generation ?? -1) + 1);
    expect(attempts[0]?.commit(() => true)).toBe(false);
    retryGate.resolve();
    await waitForPhase(runtime.tasks, "picture-retry", "inserted");
    expect(commits).toBe(1);
  });

  it("rejects success when no final commit occurred", async () => {
    const runtime = createRuntime();
    const result = await runtime.resources.startResource({
      taskId: "picture-without-commit",
      purpose: "image",
      phase: "processing",
      run: () => ({ outcome: "success" })
    });

    expect(result).toEqual({
      outcome: "failed",
      diagnostics: [{ code: "resource-task.commit-required", retryable: true }]
    });
    expect(readPhase(runtime.tasks, "picture-without-commit")).toBe("error");
  });

  it("rejects a duplicate active task identity without superseding its attempt", async () => {
    const runtime = createRuntime();
    const gate = createDeferred<void>();
    let commits = 0;
    const pending = runtime.resources.startResource({
      taskId: "picture-duplicate",
      purpose: "image",
      phase: "processing",
      run: async (attempt) => {
        await gate.promise;
        const committed = attempt.commit(() => {
          commits += 1;
          return true;
        });
        return committed ? { outcome: "success" } : failure("fixture.commit");
      }
    });

    expect(() => runtime.resources.startResource({
      taskId: "picture-duplicate",
      purpose: "image",
      phase: "processing",
      run: () => ({ outcome: "cancelled" })
    })).toThrow('Resource task "picture-duplicate" is already active.');
    gate.resolve();
    await expect(pending).resolves.toEqual({ outcome: "success" });
    expect(commits).toBe(1);
  });
});

/** @returns Isolated resource-task and feedback runtimes. */
function createRuntime(): {
  readonly tasks: ClassicEditorTaskFeedbackRuntime;
  readonly resources: ClassicEditorHostResourceTaskRuntime;
} {
  const host = new ClassicEditorHostResourceCoordinator(createHostTestServices());
  const tasks = new ClassicEditorTaskFeedbackRuntime(host);
  return { tasks, resources: new ClassicEditorHostResourceTaskRuntime(tasks) };
}

/** @param code - Public diagnostic code. @param retryable - Retry policy. @returns Failed result. */
function failure(
  code: string,
  retryable = false
): ClassicEditorHostResourceTaskResult {
  return { outcome: "failed", diagnostics: [{ code, retryable }] };
}

/** @param tasks - Feedback runtime. @param taskId - Task identity. @returns Current phase. */
function readPhase(tasks: ClassicEditorTaskFeedbackRuntime, taskId: string) {
  return tasks.snapshot.tasks.find((task) => task.taskId === taskId)?.phase;
}

/**
 * Waits for one task phase without coupling tests to promise scheduling.
 *
 * @param tasks - Feedback runtime.
 * @param taskId - Task identity.
 * @param phase - Expected phase.
 * @returns Completion after the phase is observed.
 */
async function waitForPhase(
  tasks: ClassicEditorTaskFeedbackRuntime,
  taskId: string,
  phase: string
): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    if (readPhase(tasks, taskId) === phase) return;
    await Promise.resolve();
  }
  throw new Error(`Task "${taskId}" did not reach "${phase}".`);
}

/** @returns Controllable promise for race-focused tests. */
function createDeferred<Value>(): {
  readonly promise: Promise<Value>;
  readonly resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((currentResolve) => {
    resolve = currentResolve;
  });
  return { promise, resolve };
}
