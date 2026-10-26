import type {
  QuireLayoutProviderContinuation,
  QuireLayoutProviderJob
} from "../types";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";

/** Request for opening one provider execution inside the active snapshot epoch. */
export interface QuireLayoutProviderExecutionRequest {
  /** Stable retained block owner that hosts the provider source. */
  readonly ownerId: string;
  /** Provider selected for the source in the current snapshot. */
  readonly providerId: string;
  /** Snapshot version that owns the execution. */
  readonly snapshotVersion: number;
  /** Exact source represented by the current execution. */
  readonly source: QuireLayoutSourceRef;
}

/** One execution lease opened by provider lifecycle authority. */
export interface QuireLayoutProviderExecutionLease {
  /** Stable retained block owner that hosts the provider source. */
  readonly ownerId: string;
  /** Provider selected for this execution. */
  readonly providerId: string;
  /** Snapshot version captured by the execution lease. */
  readonly snapshotVersion: number;
  /** Exact source represented by the execution. */
  readonly source: QuireLayoutSourceRef;
  /** Prior accepted continuation for the same provider and exact source. */
  readonly previousContinuation?: QuireLayoutProviderContinuation | undefined;
  /** Cooperative job canceled when a newer snapshot supersedes this lease. */
  readonly job: QuireLayoutProviderJob;
}

/** Cumulative provider execution lifecycle diagnostics. */
export interface QuireLayoutProviderExecutionLifecycleCounters {
  /** Number of snapshot epochs begun by the retained graph. */
  readonly snapshotEpochs: number;
  /** Number of provider execution leases opened. */
  readonly openedExecutions: number;
  /** Number of leases that received a prior continuation. */
  readonly suppliedContinuations: number;
  /** Number of current continuations retained after accepted execution. */
  readonly committedContinuations: number;
  /** Number of continuation records removed by terminal or rejected execution. */
  readonly discardedContinuations: number;
  /** Number of superseded jobs observed as canceled. */
  readonly canceledJobs: number;
}

/** Renderer-neutral provider execution lifecycle owned by one retained graph. */
export interface QuireLayoutProviderExecutionLifecycle {
  /**
   * Begins the snapshot epoch that owns subsequent provider executions.
   *
   * @param snapshotVersion - Newly allocated active snapshot version.
   * @returns Nothing.
   */
  beginSnapshot(snapshotVersion: number): void;

  /**
   * Publishes staged continuation state after a snapshot builds successfully.
   *
   * @param snapshotVersion - Active snapshot version being committed.
   * @returns Nothing.
   */
  endSnapshot(snapshotVersion: number): void;

  /**
   * Discards staged continuation state after a failed or superseded snapshot.
   *
   * @param snapshotVersion - Active snapshot version being abandoned.
   * @returns Nothing.
   */
  abortSnapshot(snapshotVersion: number): void;

  /**
   * Opens one provider execution and resolves eligible prior continuation.
   *
   * @param request - Stable owner, provider, version, and exact source.
   * @returns Execution lease bound to the active snapshot epoch.
   */
  openExecution(
    request: QuireLayoutProviderExecutionRequest
  ): QuireLayoutProviderExecutionLease;

  /**
   * Commits the terminal or continuing state of an accepted execution.
   *
   * @param lease - Execution lease returned by this lifecycle.
   * @param continuation - Validated current continuation, or null when terminal.
   * @returns Nothing.
   */
  acceptExecution(
    lease: QuireLayoutProviderExecutionLease,
    continuation: QuireLayoutProviderContinuation | null
  ): void;

  /**
   * Rejects one execution and removes any continuation owned by its block owner.
   *
   * @param lease - Rejected, stale, failed, or canceled execution lease.
   * @returns Nothing.
   */
  rejectExecution(lease: QuireLayoutProviderExecutionLease): void;

  /**
   * Reads cumulative lifecycle diagnostics.
   *
   * @returns Current provider lifecycle counters.
   */
  snapshot(): QuireLayoutProviderExecutionLifecycleCounters;
}
