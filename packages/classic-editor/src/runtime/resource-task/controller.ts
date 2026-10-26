import type {
  ClassicEditorHostResourceTaskAttempt,
  ClassicEditorHostResourceTaskController,
  ClassicEditorHostResourceTaskInput,
  ClassicEditorHostResourceTaskPhase,
  ClassicEditorHostResourceTaskResult,
  ClassicEditorHostResourceTaskUpdate,
  ClassicEditorTaskFeedbackController,
  ClassicEditorTaskHandle
} from "../../types";

type ResourceTaskEntry = {
  readonly input: ClassicEditorHostResourceTaskInput;
  readonly handle: ClassicEditorTaskHandle;
  readonly abortController: AbortController;
  phase: ClassicEditorHostResourceTaskPhase;
  critical: boolean;
  committed: boolean;
  settled: boolean;
};

const cancelledResult: ClassicEditorHostResourceTaskResult = Object.freeze({
  outcome: "cancelled"
});

/** Concurrent resource workflow authority backed by shared TaskFeedback. */
export class ClassicEditorHostResourceTaskRuntime
implements ClassicEditorHostResourceTaskController {
  private readonly entries = new Map<string, ResourceTaskEntry>();
  private destroyed = false;

  /**
   * Creates one workflow authority.
   *
   * @param tasks - Instance TaskFeedback authority receiving redacted facts.
   */
  constructor(private readonly tasks: ClassicEditorTaskFeedbackController) {}

  /** @inheritdoc */
  startResource(
    input: ClassicEditorHostResourceTaskInput
  ): Promise<ClassicEditorHostResourceTaskResult> {
    this.assertActive();
    const previous = this.entries.get(input.taskId);
    if (previous !== undefined && !previous.settled) {
      throw new Error(`Resource task "${input.taskId}" is already active.`);
    }
    const retained = Object.freeze({ ...input });
    const handle = this.tasks.startResource({
      taskId: retained.taskId,
      purpose: retained.purpose,
      phase: retained.phase,
      label: retained.label
    }, this.createActions(retained));
    return this.execute(this.createEntry(retained, handle));
  }

  /** @inheritdoc */
  cancel(taskId: string): boolean {
    if (this.destroyed) return false;
    return this.tasks.requestCancel(taskId);
  }

  /** @inheritdoc */
  retry(taskId: string): boolean {
    if (this.destroyed) return false;
    return this.tasks.requestRetry(taskId);
  }

  /** @inheritdoc */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const entry of this.entries.values()) entry.abortController.abort();
    this.entries.clear();
  }

  /**
   * Creates TaskFeedback actions retaining the private workflow input.
   *
   * @param input - Private replayable workflow input.
   * @returns Correlation-aware cancel and retry ports.
   */
  private createActions(input: ClassicEditorHostResourceTaskInput) {
    return {
      cancel: (handle: ClassicEditorTaskHandle): void => {
        this.cancelAttempt(handle);
      },
      retry: async (handle: ClassicEditorTaskHandle): Promise<void> => {
        await this.restartAttempt(input, handle);
      }
    };
  }

  /**
   * Creates and installs one exact attempt entry.
   *
   * @param input - Private workflow input.
   * @param handle - Fresh TaskFeedback correlation tuple.
   * @returns Installed runtime entry.
   */
  private createEntry(
    input: ClassicEditorHostResourceTaskInput,
    handle: ClassicEditorTaskHandle
  ): ResourceTaskEntry {
    const entry: ResourceTaskEntry = {
      input,
      handle,
      abortController: new AbortController(),
      phase: input.phase,
      critical: false,
      committed: false,
      settled: false
    };
    this.entries.set(handle.taskId, entry);
    return entry;
  }

  /**
   * Starts a fresh retry generation already prepared by TaskFeedback.
   *
   * @param input - Retained private workflow input.
   * @param handle - Fresh retry correlation tuple.
   * @returns Closed retry result.
   */
  private restartAttempt(
    input: ClassicEditorHostResourceTaskInput,
    handle: ClassicEditorTaskHandle
  ): Promise<ClassicEditorHostResourceTaskResult> {
    if (this.destroyed) return Promise.resolve(cancelledResult);
    const previous = this.entries.get(handle.taskId);
    previous?.abortController.abort();
    const entry = this.createEntry(input, handle);
    entry.phase = "processing";
    if (input.phase !== "processing") {
      this.tasks.update(handle, { phase: "ready", canCancel: true });
      this.tasks.update(handle, { phase: input.phase, canCancel: true });
      entry.phase = input.phase;
    }
    return this.execute(entry);
  }

  /**
   * Executes one attempt and normalizes private failures.
   *
   * @param entry - Current attempt entry.
   * @returns Correlation-safe closed result.
   */
  private async execute(entry: ResourceTaskEntry): Promise<ClassicEditorHostResourceTaskResult> {
    try {
      const result = await entry.input.run(this.createAttempt(entry));
      return this.settle(entry, result);
    } catch {
      return this.settle(entry, {
        outcome: "failed",
        diagnostics: [{ code: "resource-task.unexpected", retryable: true }]
      });
    }
  }

  /**
   * Creates the capability-limited attempt passed to a workflow owner.
   *
   * @param entry - Current private runtime entry.
   * @returns Frozen public attempt capability.
   */
  private createAttempt(entry: ResourceTaskEntry): ClassicEditorHostResourceTaskAttempt {
    return Object.freeze({
      handle: entry.handle,
      signal: entry.abortController.signal,
      update: (update: ClassicEditorHostResourceTaskUpdate): boolean =>
        this.updateAttempt(entry, update),
      commit: (operation: () => boolean): boolean => this.commitAttempt(entry, operation)
    });
  }

  /**
   * Publishes one non-terminal update for the exact active generation.
   *
   * @param entry - Producing attempt.
   * @param update - Redacted next state.
   * @returns Whether TaskFeedback accepted the update.
   */
  private updateAttempt(
    entry: ResourceTaskEntry,
    update: ClassicEditorHostResourceTaskUpdate
  ): boolean {
    if (!this.isCurrent(entry) || entry.critical || entry.settled) return false;
    const accepted = this.tasks.update(entry.handle, { ...update, canCancel: true });
    if (accepted) entry.phase = update.phase;
    return accepted;
  }

  /**
   * Executes one synchronous final command after excluding cancellation.
   *
   * @param entry - Producing attempt.
   * @param operation - Feature-owned final command.
   * @returns Whether the command committed.
   */
  private commitAttempt(entry: ResourceTaskEntry, operation: () => boolean): boolean {
    if (!this.isCurrent(entry) || entry.critical || entry.settled) return false;
    entry.critical = true;
    if (!this.tasks.update(entry.handle, { phase: entry.phase, canCancel: false })) {
      return false;
    }
    entry.committed = operation();
    return entry.committed;
  }

  /**
   * Cancels one exact active attempt outside the commit critical section.
   *
   * @param handle - Requested correlation tuple.
   * @returns Whether cancellation was committed.
   */
  private cancelAttempt(handle: ClassicEditorTaskHandle): boolean {
    const entry = this.entries.get(handle.taskId);
    if (entry === undefined || !this.matches(entry, handle) || entry.critical || entry.settled) {
      return false;
    }
    entry.abortController.abort();
    entry.settled = true;
    this.entries.delete(handle.taskId);
    return this.tasks.update(handle, { phase: "cancelled", canCancel: false });
  }

  /**
   * Settles one exact attempt into TaskFeedback.
   *
   * @param entry - Producing attempt.
   * @param result - Private workflow result.
   * @returns Normalized result accepted by the controller.
   */
  private settle(
    entry: ResourceTaskEntry,
    result: ClassicEditorHostResourceTaskResult
  ): ClassicEditorHostResourceTaskResult {
    if (!this.isCurrent(entry) || entry.settled) return cancelledResult;
    entry.settled = true;
    if (entry.abortController.signal.aborted || result.outcome === "cancelled") {
      entry.abortController.abort();
      this.tasks.update(entry.handle, { phase: "cancelled", canCancel: false });
      this.entries.delete(entry.handle.taskId);
      return cancelledResult;
    }
    if (result.outcome === "failed") {
      this.tasks.update(entry.handle, {
        phase: "error",
        diagnostics: result.diagnostics,
        canCancel: false
      });
      this.entries.delete(entry.handle.taskId);
      return result;
    }
    if (!entry.committed) {
      const failed: ClassicEditorHostResourceTaskResult = {
        outcome: "failed",
        diagnostics: [{ code: "resource-task.commit-required", retryable: true }]
      };
      this.tasks.update(entry.handle, {
        phase: "error",
        diagnostics: failed.diagnostics,
        canCancel: false
      });
      this.entries.delete(entry.handle.taskId);
      return failed;
    }
    this.tasks.update(entry.handle, {
      phase: entry.input.successPhase ?? "inserted",
      canCancel: false
    });
    this.entries.delete(entry.handle.taskId);
    return result;
  }

  /** @param entry - Candidate entry. @returns Whether it remains current and active. */
  private isCurrent(entry: ResourceTaskEntry): boolean {
    return !this.destroyed
      && !entry.abortController.signal.aborted
      && this.entries.get(entry.handle.taskId) === entry;
  }

  /** @param entry - Runtime entry. @param handle - Candidate tuple. @returns Exact tuple match. */
  private matches(entry: ResourceTaskEntry, handle: ClassicEditorTaskHandle): boolean {
    return entry.handle.taskId === handle.taskId
      && entry.handle.attempt === handle.attempt
      && entry.handle.generation === handle.generation;
  }

  /** Throws when callers retain the runtime after final destruction. */
  private assertActive(): void {
    if (this.destroyed) throw new Error("Classic Editor resource tasks have been destroyed.");
  }
}
