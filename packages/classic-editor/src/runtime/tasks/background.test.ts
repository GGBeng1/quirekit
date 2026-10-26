import { describe, expect, it, vi } from "vitest";
import type { ClassicEditorBackgroundTaskInput } from "../../types/tasks";
import { ClassicEditorHostResourceCoordinator } from "../host-resource/coordinator";
import { createHostTestServices } from "../host-resource/test-fixtures";
import { ClassicEditorTaskFeedbackRuntime } from "./controller";

const backgroundKinds = ["upload", "export", "conversion", "import"] as const;

describe("Classic Editor background task families", () => {
  it.each(backgroundKinds)("exposes progress, cancel, error details, and retry for %s", (kind) => {
    const host = new ClassicEditorHostResourceCoordinator(createHostTestServices());
    const tasks = new ClassicEditorTaskFeedbackRuntime(host);
    const cancel = vi.fn();
    const retry = vi.fn();
    const input = createInput(kind);
    const handle = tasks.startTask(input, { cancel, retry });

    expect(tasks.update(handle, {
      phase: input.phase,
      progress: { completed: 2, total: 4, unit: "items" },
      canCancel: true
    })).toBe(true);
    expect(tasks.requestCancel(handle.taskId)).toBe(true);
    expect(cancel).toHaveBeenCalledWith(handle);
    expect(tasks.update(handle, {
      phase: "error",
      diagnostics: [{
        code: `${kind}.fixture.failed`,
        message: "Redacted fixture detail",
        retryable: true
      }]
    })).toBe(true);
    expect(tasks.snapshot.tasks[0]?.diagnostics[0]?.code).toBe(`${kind}.fixture.failed`);
    expect(tasks.requestRetry(handle.taskId)).toBe(true);
    expect(retry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1 }));
  });
});

/**
 * Creates one valid first phase for each closed background family.
 *
 * @param kind - Background operation kind.
 * @returns Typed task start input.
 */
function createInput(
  kind: typeof backgroundKinds[number]
): ClassicEditorBackgroundTaskInput {
  return {
    taskId: `${kind}-fixture`,
    kind,
    phase: kind === "upload" ? "uploading" : "processing",
    label: `${kind} fixture`
  };
}
