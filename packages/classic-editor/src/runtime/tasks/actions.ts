import type {
  ClassicEditorTaskActionPort,
  ClassicEditorTaskHandle,
  ClassicEditorTaskRecord
} from "../../types/tasks";
import { freezeTaskRecord } from "./freeze";

/**
 * Creates the optimistic correlation state for one explicit retry request.
 *
 * @param current - Retryable terminal task.
 * @param actions - Typed workflow actions.
 * @returns Immutable fresh-attempt record.
 */
export function prepareTaskRetry(
  current: ClassicEditorTaskRecord,
  actions: ClassicEditorTaskActionPort
): ClassicEditorTaskRecord {
  return freezeTaskRecord({
    ...current,
    attempt: current.attempt + 1,
    generation: current.generation + 1,
    phase: current.kind === "creation" ? "ready" : "processing",
    progress: null,
    diagnostics: [],
    canCancel: actions.cancel !== undefined,
    canRetry: false,
    toastDismissed: false
  });
}

/**
 * Converts a rejected retry port into a public redacted error.
 *
 * @param current - Fresh attempt whose port rejected.
 * @returns Retryable terminal task state.
 */
export function failTaskRetry(
  current: ClassicEditorTaskRecord
): ClassicEditorTaskRecord {
  return freezeTaskRecord({
    ...current,
    phase: "error",
    diagnostics: [{ code: "task.retry.failed", retryable: true }],
    canCancel: false,
    canRetry: true
  });
}

/**
 * Reduces one public record to the exact correlation tuple passed to action ports.
 *
 * @param record - Current immutable task record.
 * @returns Frozen correlation-only handle.
 */
export function taskActionHandle(
  record: ClassicEditorTaskRecord
): ClassicEditorTaskHandle {
  return Object.freeze({
    taskId: record.taskId,
    attempt: record.attempt,
    generation: record.generation
  });
}
