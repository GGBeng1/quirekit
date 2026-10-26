import type {
  ClassicEditorBackgroundTaskInput,
  ClassicEditorCreationTaskInput,
  ClassicEditorResourceTaskFeedbackInput,
  ClassicEditorTaskActionPort,
  ClassicEditorTaskFeedbackSnapshot,
  ClassicEditorTaskHandle,
  ClassicEditorTaskUpdate
} from "./types";

/** Listener notified after one immutable task snapshot is committed. */
export type ClassicEditorTaskFeedbackListener = (
  snapshot: ClassicEditorTaskFeedbackSnapshot
) => void;

/** Public typed authority for task feedback without document mutation methods. */
export interface ClassicEditorTaskFeedbackController {
  /** Current immutable instance snapshot. */
  readonly snapshot: ClassicEditorTaskFeedbackSnapshot;
  /**
   * Subscribes to immutable task snapshots.
   *
   * @param listener - Snapshot consumer.
   * @returns Idempotent unsubscribe callback.
   */
  subscribe(listener: ClassicEditorTaskFeedbackListener): () => void;
  /**
   * Starts one typed background task.
   *
   * @param input - Stable operation family and first visible phase.
   * @param actions - Typed workflow requests retained outside snapshots.
   * @returns Correlation handle required by later updates.
   */
  startTask(
    input: ClassicEditorBackgroundTaskInput,
    actions?: ClassicEditorTaskActionPort
  ): ClassicEditorTaskHandle;
  /**
   * Starts one explicit creation lifecycle.
   *
   * @param input - Stable creation identity and first visible phase.
   * @param actions - Typed workflow requests retained outside snapshots.
   * @returns Correlation handle required by later updates.
   */
  startCreation(
    input: ClassicEditorCreationTaskInput,
    actions?: ClassicEditorTaskActionPort
  ): ClassicEditorTaskHandle;
  /**
   * Starts one end-to-end resource workflow projection.
   *
   * @param input - Redacted resource purpose and first visible phase.
   * @param actions - Typed workflow requests retained outside snapshots.
   * @returns Correlation handle required by later updates.
   */
  startResource(
    input: ClassicEditorResourceTaskFeedbackInput,
    actions?: ClassicEditorTaskActionPort
  ): ClassicEditorTaskHandle;
  /**
   * Applies a correlation-safe workflow update.
   *
   * @param handle - Exact active attempt and generation.
   * @param update - Next lifecycle facts.
   * @returns Whether the update was accepted.
   */
  update(
    handle: ClassicEditorTaskHandle,
    update: ClassicEditorTaskUpdate
  ): boolean;
  /**
   * Requests cancellation through the registered typed workflow.
   *
   * @param taskId - Instance-local task identity.
   * @returns Whether a cancellable task was found.
   */
  requestCancel(taskId: string): boolean;
  /**
   * Requests a fresh attempt through the registered typed workflow.
   *
   * @param taskId - Instance-local task identity.
   * @returns Whether a retryable task was found.
   */
  requestRetry(taskId: string): boolean;
  /**
   * Dismisses one transient toast and releases its terminal task record.
   *
   * @param taskId - Instance-local task identity.
   */
  dismissToast(taskId: string): void;
}
