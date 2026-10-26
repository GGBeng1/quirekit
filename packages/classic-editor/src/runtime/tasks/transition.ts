import type {
  ClassicEditorTaskHandle,
  ClassicEditorTaskPhase,
  ClassicEditorTaskRecord,
  ClassicEditorTaskUpdate
} from "../../types/tasks";

const transitions: Readonly<Record<ClassicEditorTaskPhase, readonly ClassicEditorTaskPhase[]>> = {
  ready: ["choosing", "placing", "uploading", "processing", "inserted", "completed", "cancelled", "error"],
  choosing: ["placing", "uploading", "processing", "inserted", "completed", "cancelled", "error"],
  placing: ["inserted", "completed", "cancelled", "error"],
  uploading: ["ready", "processing", "inserted", "completed", "cancelled", "error"],
  processing: ["ready", "placing", "inserted", "completed", "cancelled", "error"],
  inserted: [],
  completed: [],
  cancelled: [],
  error: []
};

/**
 * Reports whether a phase transition is valid inside one attempt.
 *
 * @param current - Current phase.
 * @param next - Candidate next phase.
 * @returns Whether the lifecycle can advance.
 */
export function canTransitionTaskPhase(
  current: ClassicEditorTaskPhase,
  next: ClassicEditorTaskPhase
): boolean {
  return current === next || transitions[current].includes(next);
}

/**
 * Reports whether a task has reached a retained terminal history entry.
 *
 * @param phase - Candidate lifecycle phase.
 * @returns Whether no same-attempt transition may follow.
 */
export function isTerminalTaskPhase(phase: ClassicEditorTaskPhase): boolean {
  return phase === "inserted"
    || phase === "completed"
    || phase === "cancelled"
    || phase === "error";
}

/**
 * Matches an update handle against one exact task correlation tuple.
 *
 * @param record - Current task.
 * @param handle - Candidate correlation.
 * @returns Whether all tuple fields match.
 */
export function matchesTaskHandle(
  record: ClassicEditorTaskRecord,
  handle: ClassicEditorTaskHandle
): boolean {
  return record.taskId === handle.taskId
    && record.attempt === handle.attempt
    && record.generation === handle.generation;
}

/**
 * Validates monotonic, bounded progress inside one task attempt.
 *
 * @param current - Current task.
 * @param update - Candidate update.
 * @returns Whether progress stays monotonic.
 */
export function isTaskProgressAdvance(
  current: ClassicEditorTaskRecord,
  update: ClassicEditorTaskUpdate
): boolean {
  const next = update.progress;
  if (next === undefined || next === null) return true;
  if (next.completed < 0 || (next.total !== null && (next.total < 0 || next.completed > next.total))) return false;
  if (current.progress === null || current.progress.unit !== next.unit) return true;
  return next.completed >= current.progress.completed
    && (current.progress.total === null || next.total === current.progress.total);
}
