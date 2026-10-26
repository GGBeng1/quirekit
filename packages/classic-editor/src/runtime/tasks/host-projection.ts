import type {
  ClassicEditorHostJobSnapshot,
  ClassicEditorHostResourceController
} from "../../types/host";
import type {
  ClassicEditorTaskActionPort,
  ClassicEditorTaskPhase,
  ClassicEditorTaskRecord
} from "../../types/tasks";
import { freezeTaskRecord } from "./freeze";

/** Facts returned by one Host projection update. */
export interface ClassicEditorHostTaskProjection {
  /** Public task state without source/resource identity. */
  readonly record: Omit<ClassicEditorTaskRecord, "sequence" | "toastDismissed">;
  /** Typed actions that delegate only to the committed Host controller. */
  readonly actions: ClassicEditorTaskActionPort;
}

/**
 * Projects one Host snapshot into redacted task facts and typed action ports.
 *
 * @param host - Committed instance-scoped Host controller.
 * @param snapshot - Current immutable Host snapshot.
 * @returns Redacted projection, or null while Host is idle.
 */
export function projectClassicEditorHostTask(
  host: ClassicEditorHostResourceController,
  snapshot: ClassicEditorHostJobSnapshot | null
): ClassicEditorHostTaskProjection | null {
  if (snapshot === null) return null;
  const { intent, progress, result } = snapshot;
  return {
    record: {
      taskId: `host:${intent.operationId}`,
      attempt: intent.attempt,
      generation: intent.generation,
      kind: intent.kind === "upload" ? "upload" : "host",
      phase: resolveHostTaskPhase(snapshot),
      creationKind: null,
      hostPurpose: intent.purpose,
      label: null,
      progress: progress.totalBytes === null && progress.completedBytes === 0
        ? null
        : {
            completed: progress.completedBytes,
            total: progress.totalBytes,
            unit: "bytes"
          },
      diagnostics: result !== null && (result.outcome === "failed" || result.outcome === "denied")
        ? [result.diagnostic]
        : [],
      canCancel: result === null && progress.canCancel,
      canRetry: result !== null
        && (result.outcome === "failed" || result.outcome === "denied")
        && result.diagnostic.retryable
    },
    actions: {
      cancel: () => host.cancel(intent),
      retry: () => host.retry(intent).then(() => undefined)
    }
  };
}

/**
 * Preserves local presentation facts while accepting a fresh Host projection.
 *
 * @param previous - Previous instance task, when any.
 * @param record - New redacted Host facts.
 * @param sequence - Creation order allocated for a new task.
 * @returns Immutable merged task record.
 */
export function mergeClassicEditorHostTask(
  previous: ClassicEditorTaskRecord | undefined,
  record: Omit<ClassicEditorTaskRecord, "sequence" | "toastDismissed">,
  sequence: number
): ClassicEditorTaskRecord {
  return freezeTaskRecord({
    ...record,
    sequence: previous?.sequence ?? sequence,
    toastDismissed: previous?.generation === record.generation
      ? previous.toastDismissed
      : false
  });
}

/**
 * Resolves Host success without confusing prepared resources with document insertion.
 *
 * @param snapshot - Correlated Host state.
 * @returns User-visible task phase.
 */
function resolveHostTaskPhase(
  snapshot: ClassicEditorHostJobSnapshot
): ClassicEditorTaskPhase {
  const result = snapshot.result;
  if (result === null) {
    if (snapshot.intent.kind === "upload") return "uploading";
    return "processing";
  }
  if (result.outcome === "cancelled") return "cancelled";
  if (result.outcome === "failed" || result.outcome === "denied") return "error";
  return result.kind === "open" ? "completed" : "ready";
}
