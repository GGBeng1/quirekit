import type { ActivityActor, PendingActivityEvent } from "../protocol/types";

/** What an editor knows about one local operation, sent to the confirming writer; never persisted as-is. */
export interface ActivityHint {
  /** Message discriminator on a shared channel. */
  readonly type: "quirekit.activity.hint";
  /** Hint format version. */
  readonly version: 1;
  /** Idempotency key the confirmed event keeps. */
  readonly operationId: string;
  /** Feature-named kind proposed by the editor. */
  readonly kind: string;
  /** Version of the kind's facts. */
  readonly kindVersion: number;
  /** Kind-owned facts proposed by the editor. */
  readonly facts: Readonly<Record<string, unknown>>;
  /** Change in document length caused by the operation; pairing uses it because it survives range merging. */
  readonly delta: number;
  /** Client time of the operation. */
  readonly occurredAt?: string | undefined;
}

/** Scheduler used by writer tools; tests pass a controlled one. */
export interface WriterClock {
  /** @returns Current time in milliseconds. */
  readonly now: () => number;
  /** @param run - Callback. @param ms - Delay. @returns Cancel function. */
  readonly schedule: (run: () => void, ms: number) => () => void;
}

/** Options of hint pairing. */
export interface HintPairingOptions<Change> {
  /** How long a change waits for its hint, and a hint for its change; default 1000 ms. */
  readonly holdMs?: number | undefined;
  /** @param change - Observed change. @param hint - Candidate hint from the same connection. @returns Whether they describe one operation. */
  readonly match: (change: Change, hint: ActivityHint) => boolean;
  /** @param change - Observed change. @param hint - Its hint, or null when none arrived in time. */
  readonly resolve: (change: Change, hint: ActivityHint | null) => void;
  /** Time source and timers. */
  readonly clock?: WriterClock | undefined;
}

/** Options of the typing coalescer. */
export interface CoalescerOptions<Candidate> {
  /** Pause after which an open candidate is emitted; default 3000 ms. */
  readonly mergeMs?: number | undefined;
  /** @param open - Collecting candidate. @param next - New candidate of the same key. @returns Whether they read as one entry. */
  readonly canMerge: (open: Candidate, next: Candidate) => boolean;
  /** @param open - Collecting candidate. @param next - Candidate merged into it. @returns The combined candidate. */
  readonly merge: (open: Candidate, next: Candidate) => Candidate;
  /** @param candidate - Finished candidate. */
  readonly emit: (candidate: Candidate) => void;
  /** Time source and timers. */
  readonly clock?: WriterClock | undefined;
}

/** Options of the session tracker. */
export interface SessionTrackerOptions {
  /** A reconnect within this window continues the same session; default 60000 ms. */
  readonly graceMs?: number | undefined;
  /**
   * @param kind - `session.join` or `session.leave`.
   * @param actor - Authenticated actor.
   * @param at - Time of the transition.
   */
  readonly emit: (kind: "session.join" | "session.leave", actor: ActivityActor, at: number) => void;
  /** Time source and timers. */
  readonly clock?: WriterClock | undefined;
}

/** Pending events per document, taken by the host inside the transaction that stores the document. */
export interface ActivityOutbox {
  /** @param key - Document key. @param events - Events to persist with the next document store. */
  add(key: string, events: readonly PendingActivityEvent[]): void;
  /** @param key - Document key. @returns All pending events, removed from the outbox. */
  take(key: string): readonly PendingActivityEvent[];
  /** @param key - Document key. @param events - Events whose persistence failed, put back in front. */
  restore(key: string, events: readonly PendingActivityEvent[]): void;
  /** @param key - Document key. @returns Number of pending events. */
  size(key: string): number;
}
