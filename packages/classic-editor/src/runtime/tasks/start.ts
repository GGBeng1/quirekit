import type {
  ClassicEditorBackgroundTaskInput,
  ClassicEditorCreationTaskInput,
  ClassicEditorResourceTaskFeedbackInput,
  ClassicEditorTaskActionPort,
  ClassicEditorTaskHandle,
  ClassicEditorTaskRecord
} from "../../types/tasks";
import { freezeTaskRecord } from "./freeze";
import { isTerminalTaskPhase } from "./transition";

/** Result of preparing one collision-safe task start. */
export interface ClassicEditorPreparedTaskStart {
  /** Correlation returned to the workflow owner. */
  readonly handle: ClassicEditorTaskHandle;
  /** Immutable initial public task state. */
  readonly record: ClassicEditorTaskRecord;
  /** Defensively copied side-effect ports. */
  readonly actions: ClassicEditorTaskActionPort;
}

/**
 * Creates one initial task state without touching controller collections.
 *
 * @param input - Background or creation task input.
 * @param previous - Previous same-id terminal task, when any.
 * @param sequence - Creation order for a new identity.
 * @param actions - Typed workflow request ports.
 * @returns Prepared immutable task start.
 */
export function prepareTaskStart(
  input: ClassicEditorBackgroundTaskInput | ClassicEditorCreationTaskInput | ClassicEditorResourceTaskFeedbackInput,
  previous: ClassicEditorTaskRecord | undefined,
  sequence: number,
  actions: ClassicEditorTaskActionPort
): ClassicEditorPreparedTaskStart {
  if (previous !== undefined && !isTerminalTaskPhase(previous.phase)) {
    throw new RangeError(`Task "${input.taskId}" is already active.`);
  }
  const handle = Object.freeze({
    taskId: input.taskId,
    attempt: (previous?.attempt ?? -1) + 1,
    generation: (previous?.generation ?? -1) + 1
  });
  const creation = "creationKind" in input;
  const resource = "purpose" in input;
  return {
    handle,
    record: freezeTaskRecord({
      ...handle,
      kind: creation ? "creation" : resource ? "host" : input.kind,
      phase: input.phase ?? "ready",
      creationKind: creation ? input.creationKind : null,
      hostPurpose: resource ? input.purpose : null,
      label: creation ? null : input.label ?? null,
      progress: null,
      diagnostics: [],
      canCancel: actions.cancel !== undefined,
      canRetry: false,
      toastDismissed: false,
      sequence: previous?.sequence ?? sequence
    }),
    actions: Object.freeze({ ...actions })
  };
}
