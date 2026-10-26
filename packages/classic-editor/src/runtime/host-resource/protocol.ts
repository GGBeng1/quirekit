import type {
  ClassicEditorHostJobProgress,
  ClassicEditorHostJobSnapshot,
  ClassicEditorHostResourceIntent,
  ClassicEditorHostResourceResult
} from "../../types/host";

/** @param intent - Intent. @returns Initial progress. */
export function createHostInitialProgress(
  intent: ClassicEditorHostResourceIntent
): ClassicEditorHostJobProgress {
  const phase = intent.kind === "acquire"
    ? "acquiring"
    : intent.kind === "resolve"
      ? "resolving"
      : intent.kind === "upload"
        ? "uploading"
        : "opening";
  return Object.freeze({
    phase,
    completedBytes: 0,
    totalBytes: null,
    attempt: intent.attempt,
    canCancel: true
  });
}

/** @param intent - Intent. @param result - Candidate result. @returns Matching correlation. */
export function doesHostResultMatch(
  intent: ClassicEditorHostResourceIntent,
  result: ClassicEditorHostResourceResult
): boolean {
  return intent.kind === result.kind
    && intent.jobId === result.jobId
    && intent.operationId === result.operationId
    && intent.attempt === result.attempt
    && intent.generation === result.generation;
}

/** @param previous - Previous progress. @param next - Candidate progress. @param attempt - Active attempt. @returns Valid forward progress. */
export function isHostProgressAdvance(
  previous: ClassicEditorHostJobProgress,
  next: ClassicEditorHostJobProgress,
  attempt: number
): boolean {
  return next.attempt === attempt
    && next.phase === previous.phase
    && Number.isSafeInteger(next.completedBytes)
    && next.completedBytes >= previous.completedBytes
    && next.completedBytes >= 0
    && isValidTotal(previous.totalBytes, next.totalBytes, next.completedBytes)
    && (previous.canCancel || !next.canCancel);
}

/** @param intent - Intent. @param progress - Progress. @param result - Result. @returns Immutable copied snapshot. */
export function freezeHostSnapshot(
  intent: ClassicEditorHostResourceIntent,
  progress: ClassicEditorHostJobProgress,
  result: ClassicEditorHostResourceResult | null
): ClassicEditorHostJobSnapshot {
  return Object.freeze({
    intent: freezeHostIntent(intent),
    progress: Object.freeze({ ...progress }),
    result: result === null ? null : freezeHostResult(result)
  });
}

/** @param intent - Intent. @returns Deep-frozen intent summary. */
export function freezeHostIntent(
  intent: ClassicEditorHostResourceIntent
): ClassicEditorHostResourceIntent {
  return Object.freeze({
    ...intent,
    ...("source" in intent
      ? { source: Object.freeze({ ...intent.source }) }
      : {}),
    ...("resource" in intent
      ? { resource: Object.freeze({ ...intent.resource }) }
      : {})
  }) as ClassicEditorHostResourceIntent;
}

/** @param intent - Intent. @returns Redacted failed result. */
export function createHostFailedResult(
  intent: ClassicEditorHostResourceIntent
): ClassicEditorHostResourceResult {
  return {
    kind: intent.kind,
    jobId: intent.jobId,
    operationId: intent.operationId,
    attempt: intent.attempt,
    generation: intent.generation,
    outcome: "failed",
    diagnostic: { code: "host-adapter-failed", retryable: false }
  } as ClassicEditorHostResourceResult;
}

/** @param intent - Intent. @returns Matching cancellation result. */
export function createHostCancelledResult(
  intent: ClassicEditorHostResourceIntent
): ClassicEditorHostResourceResult {
  return {
    kind: intent.kind,
    jobId: intent.jobId,
    operationId: intent.operationId,
    attempt: intent.attempt,
    generation: intent.generation,
    outcome: "cancelled"
  } as ClassicEditorHostResourceResult;
}

/** @param left - Existing intent. @param right - Candidate intent. @returns Same job operation. */
export function isSameHostOperation(
  left: ClassicEditorHostResourceIntent,
  right: ClassicEditorHostResourceIntent
): boolean {
  return left.jobId === right.jobId && left.operationId === right.operationId;
}

/** @param candidate - Candidate. @param current - Current. @returns Monotonic increase. */
export function isNewerHostIntent(
  candidate: ClassicEditorHostResourceIntent,
  current: ClassicEditorHostResourceIntent
): boolean {
  return candidate.attempt > current.attempt
    || (
      candidate.attempt === current.attempt
      && candidate.generation > current.generation
    );
}

/** @param left - Existing intent. @param right - Candidate intent. @returns Same full correlation tuple. */
export function isSameHostTuple(
  left: ClassicEditorHostResourceIntent,
  right: ClassicEditorHostResourceIntent
): boolean {
  return left.kind === right.kind
    && left.jobId === right.jobId
    && left.operationId === right.operationId
    && left.attempt === right.attempt
    && left.generation === right.generation;
}

/** @param previous - Previous total. @param next - Candidate total. @param completed - Candidate completed bytes. @returns Whether total facts remain consistent. */
function isValidTotal(
  previous: number | null,
  next: number | null,
  completed: number
): boolean {
  if (next !== null && (!Number.isSafeInteger(next) || next < completed)) return false;
  return previous === null ? true : next === previous;
}

/** @param result - Result. @returns Deep-frozen public result. */
function freezeHostResult(
  result: ClassicEditorHostResourceResult
): ClassicEditorHostResourceResult {
  return Object.freeze({
    ...result,
    ...("resource" in result
      ? { resource: Object.freeze({ ...result.resource }) }
      : {}),
    ...("diagnostic" in result
      ? { diagnostic: Object.freeze({ ...result.diagnostic }) }
      : {})
  }) as ClassicEditorHostResourceResult;
}
