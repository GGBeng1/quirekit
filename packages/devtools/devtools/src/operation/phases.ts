import type { QuireEditor } from "@quirekit/core";
import type {
  QuireDevtoolsClock,
  QuireDevtoolsMeasuredPhase
} from "../types";

/** Options used to collect editor operation phase timings. */
export interface QuireDevtoolsEditorPhaseCollectorOptions {
  /** Editor whose public events should be observed during one dispatch. */
  readonly editor: QuireEditor;
  /** Clock used to timestamp phases. */
  readonly clock: QuireDevtoolsClock;
}

/** Collector lifecycle returned while one operation is being dispatched. */
export interface QuireDevtoolsEditorPhaseCollector {
  /**
   * Stops collecting operation phases and removes temporary event listeners.
   *
   * @returns Measured phases in chronological order.
   */
  finish(): readonly QuireDevtoolsMeasuredPhase[];
}

/**
 * Collects best-effort editor phase timings from public editor events.
 *
 * @param options - Editor and clock used for phase timing.
 * @returns Collector lifecycle for the current dispatch.
 */
export function collectQuireDevtoolsEditorOperationPhases(
  options: QuireDevtoolsEditorPhaseCollectorOptions
): QuireDevtoolsEditorPhaseCollector {
  const phases: QuireDevtoolsMeasuredPhase[] = [];
  let pmApplyStartedAt: number | undefined;
  let editorEventsStartedAt: number | undefined;
  let mountedViewsStartedAt: number | undefined;
  let finished = false;

  /** Marks when core starts applying the transaction. */
  const handleBeforeTransaction = (): void => {
    pmApplyStartedAt ??= options.clock();
  };

  /** Marks when PM apply and public state snapshot work have completed. */
  const handleTransaction = (): void => {
    if (editorEventsStartedAt !== undefined) {
      return;
    }

    const timestamp = options.clock();

    if (pmApplyStartedAt !== undefined) {
      pushPhase(phases, "pm-apply", pmApplyStartedAt, timestamp);
    }

    editorEventsStartedAt = timestamp;
  };

  /** Marks when editor lifecycle/update events are done and mounted views begin. */
  const handleUpdate = (): void => {
    const timestamp = options.clock();

    if (editorEventsStartedAt === undefined && pmApplyStartedAt !== undefined) {
      pushPhase(phases, "pm-apply", pmApplyStartedAt, timestamp);
      editorEventsStartedAt = timestamp;
    }

    if (editorEventsStartedAt !== undefined) {
      pushPhase(phases, "editor-events", editorEventsStartedAt, timestamp);
    }

    mountedViewsStartedAt = timestamp;
  };

  options.editor.on("beforeTransaction", handleBeforeTransaction);
  options.editor.on("transaction", handleTransaction);
  options.editor.on("update", handleUpdate);

  return {
    finish: () => {
      if (finished) {
        return phases;
      }

      finished = true;
      const endedAt = options.clock();

      if (mountedViewsStartedAt !== undefined) {
        pushPhase(phases, "mounted-views", mountedViewsStartedAt, endedAt);
      } else if (editorEventsStartedAt !== undefined) {
        pushPhase(phases, "editor-events", editorEventsStartedAt, endedAt);
      } else if (pmApplyStartedAt !== undefined) {
        pushPhase(phases, "pm-apply", pmApplyStartedAt, endedAt);
      }

      options.editor.off("beforeTransaction", handleBeforeTransaction);
      options.editor.off("transaction", handleTransaction);
      options.editor.off("update", handleUpdate);

      return phases;
    }
  };
}

/**
 * Adds one measured phase when the range is valid.
 *
 * @param phases - Mutable phase list.
 * @param name - Phase name.
 * @param startedAt - Phase start timestamp.
 * @param endedAt - Phase end timestamp.
 */
function pushPhase(
  phases: QuireDevtoolsMeasuredPhase[],
  name: string,
  startedAt: number,
  endedAt: number
): void {
  if (endedAt < startedAt) {
    return;
  }

  phases.push({
    name,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt
  });
}
