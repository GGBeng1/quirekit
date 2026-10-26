import type { ComputedRef, Ref } from "vue";
import type { QuireKitTaskRequestContext } from "../../../../components/task/types";

/** Independently cancelled task operations. */
export type TaskRequestChannel = "submission" | "search";

/** Private cancellation owner retained only while a request is current. */
export interface ActiveTaskRequest {
  /** Immutable identity passed to business consumers. */
  readonly context: QuireKitTaskRequestContext;
  /** Controller owned exclusively by the task. */
  readonly controller: AbortController;
}

/** Atomically published request ownership for one task. */
export interface TaskRequestState {
  /** Current session, or null while closed. */
  readonly sessionId: string | null;
  /** Synchronously locked submission. */
  readonly submission: ActiveTaskRequest | null;
  /** Latest search request. */
  readonly search: ActiveTaskRequest | null;
}

/** Private shared request controller; lifecycle owners call end on disposal. */
export interface TaskRequests {
  /** Current session identity; never writable by consumers. */
  readonly sessionId: Readonly<Ref<string | null>>;
  /** Whether the current session has an unfinished submission. */
  readonly submitting: ComputedRef<boolean>;
  /** @returns The allocated session id; synchronous abort listeners may supersede it. */
  begin(): string;
  /** Invalidates both channels before notifying their abort listeners. */
  end(): void;
  /** @returns A newly locked request, or null while closed, occupied, or synchronously invalidated. */
  startSubmission(): QuireKitTaskRequestContext | null;
  /** @returns The replacement search, or null if cancellation reentrancy superseded it. */
  startSearch(): QuireKitTaskRequestContext | null;
  /**
   * Checks identity after asynchronous work or consumer callbacks.
   * @param context - Request including any consumer-added business fields.
   * @param channel - Its independent ownership channel.
   * @returns Whether this exact request still belongs to the active session.
   */
  isCurrent(context: QuireKitTaskRequestContext, channel: TaskRequestChannel): boolean;
  /** @param context - Completed submission; stale completions leave newer work untouched. */
  finishSubmission(context: QuireKitTaskRequestContext): void;
  /** Cancels only the current submission, retaining the session and search. */
  cancelSubmission(): void;
  /** Cancels only the current or pending replacement search. */
  cancelSearch(): void;
}
