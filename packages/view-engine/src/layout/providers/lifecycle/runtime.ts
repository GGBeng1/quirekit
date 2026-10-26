import type {
  QuireLayoutProviderContinuation
} from "../types";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireLayoutProviderExecutionLease,
  QuireLayoutProviderExecutionLifecycle,
  QuireLayoutProviderExecutionLifecycleCounters,
  QuireLayoutProviderExecutionRequest
} from "./types";

/** Continuation record retained only below one stable block owner. */
interface QuireLayoutProviderContinuationRecord {
  /** Provider that produced the continuation. */
  readonly providerId: string;
  /** Exact source represented by the continuation. */
  readonly source: QuireLayoutSourceRef;
  /** Immutable provider state produced by an accepted execution. */
  readonly continuation: QuireLayoutProviderContinuation;
}

/** Default renderer-neutral lifecycle implementation. */
class DefaultQuireLayoutProviderExecutionLifecycle
  implements QuireLayoutProviderExecutionLifecycle {
  /** Active snapshot version, or undefined before the first snapshot begins. */
  private activeSnapshotVersion: number | undefined;
  /** Latest successfully published continuation keyed by retained block owner. */
  private readonly continuations = new Map<
    string,
    QuireLayoutProviderContinuationRecord
  >();
  /** Continuations staged by the active snapshot before atomic publication. */
  private stagedContinuations:
    Map<string, QuireLayoutProviderContinuationRecord> | undefined;
  /** Provider owners observed during the active snapshot. */
  private activeOwnerIds: Set<string> | undefined;
  /** Published owner continuations invalidated by the active snapshot. */
  private stagedDiscardedOwnerIds: Set<string> | undefined;
  /** Number of continuations staged for publication by the active snapshot. */
  private stagedCommittedContinuations = 0;
  /** Number of snapshot epochs begun. */
  private snapshotEpochs = 0;
  /** Number of provider executions opened. */
  private openedExecutions = 0;
  /** Number of prior continuations supplied. */
  private suppliedContinuations = 0;
  /** Number of current continuations committed. */
  private committedContinuations = 0;
  /** Number of retained continuations discarded. */
  private discardedContinuations = 0;
  /** Number of distinct superseded jobs observed as canceled. */
  private canceledJobs = 0;

  /** @inheritdoc */
  beginSnapshot(snapshotVersion: number): void {
    if (!Number.isSafeInteger(snapshotVersion) || snapshotVersion < 0) {
      throw new Error(`Invalid layout provider snapshot version: ${snapshotVersion}`);
    }
    // Beginning a newer epoch abandons unpublished work from an interrupted
    // predecessor. Published continuation remains untouched until a full
    // snapshot reaches endSnapshot.
    this.clearActiveSnapshot();
    this.activeSnapshotVersion = snapshotVersion;
    this.stagedContinuations = new Map(this.continuations);
    this.activeOwnerIds = new Set();
    this.stagedDiscardedOwnerIds = new Set();
    this.snapshotEpochs += 1;
  }

  /** @inheritdoc */
  endSnapshot(snapshotVersion: number): void {
    this.assertActiveSnapshot(snapshotVersion);
    const staged = this.stagedContinuations!;
    const activeOwnerIds = this.activeOwnerIds!;

    // Owners absent from the successfully compiled snapshot are stale. Prune
    // them before publishing the staged map as one retained state transition.
    for (const ownerId of staged.keys()) {
      if (!activeOwnerIds.has(ownerId)) {
        staged.delete(ownerId);
      }
    }
    for (const ownerId of this.continuations.keys()) {
      if (!staged.has(ownerId)) {
        this.stagedDiscardedOwnerIds!.add(ownerId);
      }
    }

    this.continuations.clear();
    for (const [ownerId, continuation] of staged) {
      this.continuations.set(ownerId, continuation);
    }
    this.committedContinuations += this.stagedCommittedContinuations;
    this.discardedContinuations += this.stagedDiscardedOwnerIds!.size;
    this.clearActiveSnapshot();
  }

  /** @inheritdoc */
  abortSnapshot(snapshotVersion: number): void {
    this.assertActiveSnapshot(snapshotVersion);
    this.clearActiveSnapshot();
  }

  /** @inheritdoc */
  openExecution(
    request: QuireLayoutProviderExecutionRequest
  ): QuireLayoutProviderExecutionLease {
    if (request.snapshotVersion !== this.activeSnapshotVersion) {
      throw new Error(
        `Layout provider execution snapshot ${request.snapshotVersion} is not active snapshot ${this.activeSnapshotVersion ?? "none"}.`
      );
    }

    // A block owner is the invalidation boundary. Reusing continuation requires
    // both provider authority and exact source identity to remain unchanged.
    const retained = this.continuations.get(request.ownerId);
    const previousContinuation = retained !== undefined
      && retained.providerId === request.providerId
      && sameSource(retained.source, request.source)
      ? retained.continuation
      : undefined;
    this.activeOwnerIds!.add(request.ownerId);
    if (retained !== undefined && previousContinuation === undefined) {
      this.stagedContinuations!.delete(request.ownerId);
      this.stagedDiscardedOwnerIds!.add(request.ownerId);
    }

    this.openedExecutions += 1;
    this.suppliedContinuations += previousContinuation === undefined ? 0 : 1;
    let cancellationObserved = false;
    const jobId = [
      "layout",
      request.snapshotVersion,
      request.providerId,
      request.ownerId
    ].join(":");

    return {
      ...request,
      ...(previousContinuation === undefined ? {} : { previousContinuation }),
      job: {
        jobId,
        isCanceled: () => {
          const canceled = this.activeSnapshotVersion !== request.snapshotVersion;
          if (canceled && !cancellationObserved) {
            cancellationObserved = true;
            this.canceledJobs += 1;
          }
          return canceled;
        }
      }
    };
  }

  /** @inheritdoc */
  acceptExecution(
    lease: QuireLayoutProviderExecutionLease,
    continuation: QuireLayoutProviderContinuation | null
  ): void {
    if (lease.snapshotVersion !== this.activeSnapshotVersion || lease.job.isCanceled()) {
      return;
    }

    if (continuation === null) {
      this.discardContinuation(lease.ownerId);
      return;
    }

    if (
      continuation.providerId !== lease.providerId
      || continuation.snapshotVersion !== lease.snapshotVersion
      || !sameSource(continuation.source, lease.source)
    ) {
      this.discardContinuation(lease.ownerId);
      throw new Error(
        `Layout provider continuation does not match execution lease "${lease.job.jobId}".`
      );
    }

    this.stagedContinuations!.set(lease.ownerId, {
      providerId: lease.providerId,
      source: lease.source,
      continuation
    });
    this.stagedCommittedContinuations += 1;
  }

  /** @inheritdoc */
  rejectExecution(lease: QuireLayoutProviderExecutionLease): void {
    this.discardContinuation(lease.ownerId);
  }

  /** @inheritdoc */
  snapshot(): QuireLayoutProviderExecutionLifecycleCounters {
    return {
      snapshotEpochs: this.snapshotEpochs,
      openedExecutions: this.openedExecutions,
      suppliedContinuations: this.suppliedContinuations,
      committedContinuations: this.committedContinuations,
      discardedContinuations: this.discardedContinuations,
      canceledJobs: this.canceledJobs
    };
  }

  /**
   * Removes one owner continuation and records an actual deletion.
   *
   * @param ownerId - Stable retained block owner.
   * @returns Nothing.
   */
  private discardContinuation(ownerId: string): void {
    this.stagedContinuations?.delete(ownerId);
    if (this.continuations.has(ownerId)) {
      this.stagedDiscardedOwnerIds?.add(ownerId);
    }
  }

  /**
   * Rejects lifecycle operations outside their active snapshot transaction.
   *
   * @param snapshotVersion - Snapshot expected to own the current transaction.
   * @returns Nothing.
   */
  private assertActiveSnapshot(snapshotVersion: number): void {
    if (
      this.activeSnapshotVersion !== snapshotVersion
      || this.stagedContinuations === undefined
      || this.activeOwnerIds === undefined
      || this.stagedDiscardedOwnerIds === undefined
    ) {
      throw new Error(
        `Layout provider snapshot ${snapshotVersion} is not the active transaction ${this.activeSnapshotVersion ?? "none"}.`
      );
    }
  }

  /**
   * Clears unpublished state without mutating the last committed snapshot.
   *
   * @returns Nothing.
   */
  private clearActiveSnapshot(): void {
    this.activeSnapshotVersion = undefined;
    this.stagedContinuations = undefined;
    this.activeOwnerIds = undefined;
    this.stagedDiscardedOwnerIds = undefined;
    this.stagedCommittedContinuations = 0;
  }
}

/**
 * Creates a provider execution lifecycle for one retained layout graph.
 *
 * @returns Empty lifecycle awaiting its first snapshot epoch.
 */
export function createQuireLayoutProviderExecutionLifecycle(): QuireLayoutProviderExecutionLifecycle {
  return new DefaultQuireLayoutProviderExecutionLifecycle();
}

/**
 * Reports whether two provider source identities are exactly equal.
 *
 * @param left - Previously retained source identity.
 * @param right - Current source identity.
 * @returns Whether source id and optional exact range match.
 */
function sameSource(
  left: QuireLayoutSourceRef,
  right: QuireLayoutSourceRef
): boolean {
  if (left.sourceId !== right.sourceId) {
    return false;
  }
  if (left.range === undefined || right.range === undefined) {
    return left.range === right.range;
  }
  return left.range.from === right.range.from && left.range.to === right.range.to;
}
