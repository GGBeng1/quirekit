import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorHostAcquireResult,
  ClassicEditorHostAdapterRequest
} from "../../types/host";
import { ClassicEditorHostResourceCoordinator } from "../host-resource/coordinator";
import {
  createHostTestAcquireIntent,
  createHostTestDeferred,
  createHostTestServices
} from "../host-resource/test-fixtures";
import { ClassicEditorTaskFeedbackRuntime } from "./controller";

describe("Classic Editor task feedback runtime", () => {
  it("publishes the complete creation lifecycle and rejects stale handles", () => {
    const runtime = createRuntime();
    const snapshots: number[] = [];
    runtime.tasks.subscribe((snapshot) => snapshots.push(snapshot.revision));
    const first = runtime.tasks.startCreation({
      taskId: "image-create",
      creationKind: "image"
    });

    expect(readTask(runtime.tasks, "image-create")).toMatchObject({
      phase: "ready",
      creationKind: "image"
    });
    expect(runtime.tasks.update(first, { phase: "choosing" })).toBe(true);
    expect(runtime.tasks.update(first, {
      phase: "uploading",
      progress: { completed: 4, total: 10, unit: "bytes" }
    })).toBe(true);
    expect(runtime.tasks.update(first, {
      phase: "inserted",
      canCancel: false
    })).toBe(true);

    const second = runtime.tasks.startCreation({
      taskId: "image-create",
      creationKind: "image",
      phase: "placing"
    });
    expect(second.generation).toBe(first.generation + 1);
    expect(runtime.tasks.update(first, { phase: "error" })).toBe(false);
    expect(readTask(runtime.tasks, "image-create")?.phase).toBe("placing");
    expect(snapshots).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("rejects backward and unbounded progress", () => {
    const runtime = createRuntime();
    const handle = runtime.tasks.startCreation({
      taskId: "attachment-create",
      creationKind: "attachment",
      phase: "uploading"
    });

    expect(runtime.tasks.update(handle, {
      phase: "uploading",
      progress: { completed: 8, total: 10, unit: "bytes" }
    })).toBe(true);
    expect(runtime.tasks.update(handle, {
      phase: "uploading",
      progress: { completed: 7, total: 10, unit: "bytes" }
    })).toBe(false);
    expect(runtime.tasks.update(handle, {
      phase: "uploading",
      progress: { completed: 11, total: 10, unit: "bytes" }
    })).toBe(false);
    expect(runtime.tasks.update(handle, { phase: "choosing" })).toBe(false);
  });

  it("routes cancel and retry only through typed owner ports", () => {
    const runtime = createRuntime();
    const cancel = vi.fn();
    const retry = vi.fn();
    const handle = runtime.tasks.startCreation({
      taskId: "text-box-create",
      creationKind: "text-box"
    }, { cancel, retry });

    expect(runtime.tasks.requestCancel(handle.taskId)).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith(handle);
    expect(runtime.tasks.update(handle, {
      phase: "error",
      diagnostics: [{ code: "fixture.denied", retryable: true }]
    })).toBe(true);
    expect(runtime.tasks.requestRetry(handle.taskId)).toBe(true);
    expect(retry).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, generation: 1 }));
    expect(readTask(runtime.tasks, handle.taskId)).toMatchObject({
      phase: "ready",
      attempt: 1,
      generation: 1,
      diagnostics: []
    });
    expect(runtime.tasks.update(handle, { phase: "inserted" })).toBe(false);
  });

  it("projects Host progress without treating prepared bytes as insertion", async () => {
    const deferred = createHostTestDeferred<ClassicEditorHostAcquireResult>();
    let request: ClassicEditorHostAdapterRequest<ReturnType<typeof createHostTestAcquireIntent>> | undefined;
    const host = new ClassicEditorHostResourceCoordinator(createHostTestServices({
      acquire: (current) => {
        request = current;
        current.progress.report({
          phase: "acquiring",
          completedBytes: 5,
          totalBytes: 10,
          attempt: current.intent.attempt,
          canCancel: true
        });
        return deferred.promise;
      }
    }));
    const tasks = new ClassicEditorTaskFeedbackRuntime(host);
    const intent = createHostTestAcquireIntent({ operationId: "host-operation" });
    const pending = host.start(intent);

    expect(readTask(tasks, "host:host-operation")).toMatchObject({
      phase: "processing",
      progress: { completed: 5, total: 10 },
      hostPurpose: "image",
      canCancel: true
    });
    deferred.resolve(successResult(request!.intent));
    await pending;

    expect(readTask(tasks, "host:host-operation")).toMatchObject({
      phase: "ready",
      canCancel: false,
      diagnostics: []
    });
    expect(JSON.stringify(tasks.snapshot)).not.toContain("source");
    expect(JSON.stringify(tasks.snapshot)).not.toContain("policy-1");
  });

  it("isolates tasks across instances and releases only the dismissed terminal task", () => {
    const left = createRuntime();
    const right = createRuntime();
    const leftHandle = left.tasks.startCreation({
      taskId: "same-id",
      creationKind: "table"
    });
    right.tasks.startCreation({ taskId: "same-id", creationKind: "link" });

    left.tasks.update(leftHandle, { phase: "inserted" });
    left.tasks.dismissToast("same-id");
    expect(left.tasks.snapshot.tasks).toHaveLength(0);
    expect(readTask(right.tasks, "same-id")).toMatchObject({
      phase: "ready",
      creationKind: "link"
    });
  });
});

/** @returns Isolated default Host and task controllers. */
function createRuntime(): {
  readonly host: ClassicEditorHostResourceCoordinator;
  readonly tasks: ClassicEditorTaskFeedbackRuntime;
} {
  const host = new ClassicEditorHostResourceCoordinator(createHostTestServices());
  return { host, tasks: new ClassicEditorTaskFeedbackRuntime(host) };
}

/** @param tasks - Task controller. @param taskId - Local identity. @returns Matching task. */
function readTask(tasks: ClassicEditorTaskFeedbackRuntime, taskId: string) {
  return tasks.snapshot.tasks.find((task) => task.taskId === taskId);
}

/** @param intent - Matching typed intent. @returns Prepared Host success fixture. */
function successResult(
  intent: ReturnType<typeof createHostTestAcquireIntent>
): ClassicEditorHostAcquireResult {
  return {
    kind: "acquire",
    jobId: intent.jobId,
    operationId: intent.operationId,
    attempt: intent.attempt,
    generation: intent.generation,
    outcome: "success",
    resource: {
      id: "prepared",
      digest: "digest",
      bytes: 10,
      mimeType: "image/png"
    }
  };
}
