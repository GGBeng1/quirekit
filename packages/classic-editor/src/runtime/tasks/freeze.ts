import type {
  ClassicEditorTaskFeedbackSnapshot,
  ClassicEditorTaskRecord
} from "../../types/tasks";

/**
 * Defensively copies one task record without retaining caller-owned objects.
 *
 * @param record - Candidate task state.
 * @returns Deeply immutable public record.
 */
export function freezeTaskRecord(
  record: ClassicEditorTaskRecord
): ClassicEditorTaskRecord {
  return Object.freeze({
    ...record,
    progress: record.progress === null ? null : Object.freeze({ ...record.progress }),
    diagnostics: Object.freeze(record.diagnostics.map((item) => Object.freeze({ ...item })))
  });
}

/**
 * Freezes one stable task collection for subscriber replay.
 *
 * @param revision - Monotonic controller revision.
 * @param tasks - Current instance-local task records.
 * @returns Immutable controller snapshot.
 */
export function freezeTaskSnapshot(
  revision: number,
  tasks: readonly ClassicEditorTaskRecord[]
): ClassicEditorTaskFeedbackSnapshot {
  return Object.freeze({
    revision,
    tasks: Object.freeze(tasks.map(freezeTaskRecord))
  });
}
