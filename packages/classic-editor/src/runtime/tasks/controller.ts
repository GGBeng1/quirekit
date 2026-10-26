import type { ClassicEditorHostResourceController } from "../../types/host";
import type {
  ClassicEditorBackgroundTaskInput,
  ClassicEditorCreationTaskInput,
  ClassicEditorResourceTaskFeedbackInput,
  ClassicEditorTaskActionPort,
  ClassicEditorTaskFeedbackController,
  ClassicEditorTaskFeedbackListener,
  ClassicEditorTaskFeedbackSnapshot,
  ClassicEditorTaskHandle,
  ClassicEditorTaskRecord,
  ClassicEditorTaskUpdate
} from "../../types/tasks";
import { freezeTaskRecord, freezeTaskSnapshot } from "./freeze";
import { failTaskRetry, prepareTaskRetry, taskActionHandle } from "./actions";
import {
  mergeClassicEditorHostTask,
  projectClassicEditorHostTask
} from "./host-projection";
import {
  canTransitionTaskPhase,
  isTaskProgressAdvance,
  isTerminalTaskPhase,
  matchesTaskHandle
} from "./transition";
import { prepareTaskStart } from "./start";

/** Instance-scoped typed authority for background and creation task feedback. */
export class ClassicEditorTaskFeedbackRuntime
implements ClassicEditorTaskFeedbackController {
  private readonly records = new Map<string, ClassicEditorTaskRecord>();
  private readonly actions = new Map<string, ClassicEditorTaskActionPort>();
  private readonly listeners = new Set<ClassicEditorTaskFeedbackListener>();
  private readonly unsubscribeHost: () => void;
  private snapshotValue = freezeTaskSnapshot(0, []);
  private sequence = 0;
  private destroyed = false;
  /**
   * Creates one controller and subscribes to read-only Host snapshots.
   *
   * @param host - Committed instance Host controller.
   */
  constructor(host: ClassicEditorHostResourceController) {
    this.unsubscribeHost = host.subscribe((snapshot) => {
      const projection = projectClassicEditorHostTask(host, snapshot);
      if (projection !== null) this.projectHost(projection.record, projection.actions);
    });
  }
  /** @returns Current immutable instance-local task snapshot. */
  get snapshot(): ClassicEditorTaskFeedbackSnapshot { return this.snapshotValue; }

  /** @inheritdoc */
  subscribe(listener: ClassicEditorTaskFeedbackListener): () => void {
    this.assertActive();
    this.listeners.add(listener);
    listener(this.snapshotValue);
    return () => this.listeners.delete(listener);
  }

  /** @inheritdoc */
  startTask(
    input: ClassicEditorBackgroundTaskInput,
    actions: ClassicEditorTaskActionPort = {}
  ): ClassicEditorTaskHandle {
    return this.registerStart(input, actions);
  }

  /** @inheritdoc */
  startCreation(
    input: ClassicEditorCreationTaskInput,
    actions: ClassicEditorTaskActionPort = {}
  ): ClassicEditorTaskHandle {
    return this.registerStart(input, actions);
  }

  /** @inheritdoc */
  startResource(
    input: ClassicEditorResourceTaskFeedbackInput,
    actions: ClassicEditorTaskActionPort = {}
  ): ClassicEditorTaskHandle {
    return this.registerStart(input, actions);
  }

  /** @param input - Typed task input. @param actions - Workflow ports. @returns Correlation handle. */
  private registerStart(
    input: ClassicEditorBackgroundTaskInput | ClassicEditorCreationTaskInput | ClassicEditorResourceTaskFeedbackInput,
    actions: ClassicEditorTaskActionPort
  ): ClassicEditorTaskHandle {
    this.assertActive();
    const previous = this.records.get(input.taskId);
    const sequence = previous?.sequence ?? ++this.sequence;
    const prepared = prepareTaskStart(input, previous, sequence, actions);
    this.records.set(input.taskId, prepared.record);
    this.actions.set(input.taskId, prepared.actions);
    this.publish();
    return prepared.handle;
  }

  /** @inheritdoc */
  update(handle: ClassicEditorTaskHandle, update: ClassicEditorTaskUpdate): boolean {
    this.assertActive();
    const current = this.records.get(handle.taskId);
    if (current === undefined || !matchesTaskHandle(current, handle)) return false;
    if (!canTransitionTaskPhase(current.phase, update.phase)) return false;
    if (!isTaskProgressAdvance(current, update)) return false;
    const next = freezeTaskRecord({
      ...current,
      phase: update.phase,
      label: update.label === undefined ? current.label : update.label,
      progress: update.progress === undefined ? current.progress : update.progress,
      diagnostics: update.diagnostics === undefined ? current.diagnostics : update.diagnostics,
      canCancel: update.canCancel ?? (isTerminalTaskPhase(update.phase) ? false : current.canCancel),
      canRetry: update.phase === "error"
        && (update.diagnostics ?? current.diagnostics).some((item) => item.retryable),
      toastDismissed: false
    });
    this.records.set(handle.taskId, next);
    if (isTerminalTaskPhase(next.phase) && !next.canRetry) {
      this.actions.delete(handle.taskId);
    }
    this.publish();
    return true;
  }

  /** @inheritdoc */
  requestCancel(taskId: string): boolean {
    const current = this.records.get(taskId);
    const action = this.actions.get(taskId)?.cancel;
    if (current === undefined || !current.canCancel || action === undefined) return false;
    void Promise.resolve(action(taskActionHandle(current))).catch(() => undefined);
    return true;
  }

  /** @inheritdoc */
  requestRetry(taskId: string): boolean {
    const current = this.records.get(taskId);
    const action = this.actions.get(taskId)?.retry;
    if (current === undefined || !current.canRetry || action === undefined) return false;
    const next = prepareTaskRetry(current, this.actions.get(taskId) ?? {});
    this.records.set(taskId, next);
    this.publish();
    void Promise.resolve(action(taskActionHandle(next))).catch(() => this.failRetry(next));
    return true;
  }

  /** @inheritdoc */
  dismissToast(taskId: string): void {
    const current = this.records.get(taskId);
    if (current === undefined || current.toastDismissed) return;
    if (isTerminalTaskPhase(current.phase)) {
      this.records.delete(taskId);
      this.actions.delete(taskId);
      this.publish();
      return;
    }
    this.records.set(taskId, freezeTaskRecord({ ...current, toastDismissed: true }));
    this.publish();
  }

  /** Releases Host projection and every task observer. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribeHost();
    this.records.clear();
    this.actions.clear();
    this.listeners.clear();
  }

  /** @param record - Redacted Host task. @param actions - Host-only request ports. */
  private projectHost(
    record: Omit<ClassicEditorTaskRecord, "sequence" | "toastDismissed">,
    actions: ClassicEditorTaskActionPort
  ): void {
    if (this.destroyed) return;
    const previous = this.records.get(record.taskId);
    if (previous !== undefined && record.generation < previous.generation) return;
    const sequence = previous?.sequence ?? ++this.sequence;
    this.records.set(
      record.taskId,
      mergeClassicEditorHostTask(previous, record, sequence)
    );
    this.actions.set(record.taskId, Object.freeze({ ...actions }));
    this.publish();
  }

  /** @param record - Retry attempt whose action rejected. */
  private failRetry(record: ClassicEditorTaskRecord): void {
    const current = this.records.get(record.taskId);
    if (current !== record) return;
    this.records.set(record.taskId, failTaskRetry(record));
    this.publish();
  }

  /** Publishes one immutable ordered snapshot. */
  private publish(): void {
    if (this.destroyed) return;
    const tasks = [...this.records.values()].sort((left, right) => left.sequence - right.sequence);
    this.snapshotValue = freezeTaskSnapshot(this.snapshotValue.revision + 1, tasks);
    for (const listener of [...this.listeners]) listener(this.snapshotValue);
  }

  /** Throws when callers retain the controller after final destruction. */
  private assertActive(): void {
    if (this.destroyed) throw new Error("Classic Editor task feedback has been destroyed.");
  }
}
