import { computed, shallowRef } from "vue";
import type { QuireKitTaskRequestContext } from "../../../../components/task/types";
import type { ActiveTaskRequest, TaskRequestChannel, TaskRequests, TaskRequestState } from "./request-types";

/**
 * Owns request identity and cancellation without executing business work.
 * @param idPrefix - Stable unique identity of the consuming task instance.
 * @returns Independent submission/search channels and explicit session lifecycle.
 */
export function createTaskRequests(idPrefix: string): TaskRequests {
  const state = shallowRef<TaskRequestState>({ sessionId: null, submission: null, search: null });
  let sessionSequence = 0;
  let submissionSequence = 0;
  let searchSequence = 0;
  let searchRevision = 0;

  /** @param sessionId - New authoritative session. */
  function replaceSession(sessionId: string | null): void {
    const previous = state.value;
    searchRevision++;
    // Publish invalidation atomically before abort listeners can reenter either channel.
    state.value = { sessionId, submission: null, search: null };
    previous.submission?.controller.abort();
    previous.search?.controller.abort();
  }

  /** @returns A new session identity, without overwriting reentrant lifecycle decisions. */
  function begin(): string {
    const id = `${idPrefix}:${++sessionSequence}`;
    replaceSession(id);
    return id;
  }

  /** Ends the current session and aborts its captured requests. */
  function end(): void {
    replaceSession(null);
  }

  /**
   * Compares public identity fields so spreading a request preserves its authority.
   * @param context - Context returned to a consumer.
   * @param channel - Channel that issued it.
   * @returns Whether the live session still owns this un-aborted request.
   */
  function isCurrent(context: QuireKitTaskRequestContext, channel: TaskRequestChannel): boolean {
    const current = state.value[channel]?.context;
    return current !== undefined && state.value.sessionId === context.sessionId &&
      current.sessionId === context.sessionId && current.requestId === context.requestId &&
      current.signal === context.signal && !context.signal.aborted;
  }

  /**
   * Creates one immutable consumer context with private cancellation ownership.
   * @param sessionId - Active session captured before publication.
   * @param requestId - Independently increasing channel identity.
   * @returns A request whose signal is never proxied by Vue.
   */
  function createRequest(sessionId: string, requestId: number): ActiveTaskRequest {
    const controller = new AbortController();
    return { controller, context: Object.freeze({ sessionId, requestId, signal: controller.signal }) };
  }

  /** @returns A synchronously locked submission, or null when execution is unavailable. */
  function startSubmission(): QuireKitTaskRequestContext | null {
    const current = state.value;
    if (current.sessionId === null || current.submission !== null) return null;
    const request = createRequest(current.sessionId, ++submissionSequence);
    state.value = { ...current, submission: request };
    return isCurrent(request.context, "submission") ? request.context : null;
  }

  /** @returns The new search unless a cancellation callback superseded this intent. */
  function startSearch(): QuireKitTaskRequestContext | null {
    const sessionId = state.value.sessionId;
    const revision = ++searchRevision;
    if (sessionId === null) return null;
    const previous = state.value.search;
    if (previous !== null) {
      state.value = { ...state.value, search: null };
      previous.controller.abort();
    }
    // A listener may close, reopen, cancel, or begin a newer query; unrelated submission work is preserved.
    if (state.value.sessionId !== sessionId || searchRevision !== revision) return null;
    const request = createRequest(sessionId, ++searchSequence);
    state.value = { ...state.value, search: request };
    return isCurrent(request.context, "search") ? request.context : null;
  }

  /** @param context - Finished submission, possibly carrying additional business fields. */
  function finishSubmission(context: QuireKitTaskRequestContext): void {
    if (!isCurrent(context, "submission")) return;
    state.value = { ...state.value, submission: null };
  }

  /** Cancels submission without clearing a replacement created by an abort listener. */
  function cancelSubmission(): void {
    const previous = state.value.submission;
    if (previous === null) return;
    state.value = { ...state.value, submission: null };
    previous.controller.abort();
  }

  /** Cancels both current search ownership and any outer replacement waiting on its abort. */
  function cancelSearch(): void {
    searchRevision++;
    const previous = state.value.search;
    if (previous === null) return;
    state.value = { ...state.value, search: null };
    previous.controller.abort();
  }

  return {
    sessionId: computed(() => state.value.sessionId),
    submitting: computed(() => state.value.submission !== null),
    begin, end, startSubmission, startSearch, isCurrent,
    finishSubmission, cancelSubmission, cancelSearch
  };
}
