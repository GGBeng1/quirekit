import {
  matchesQuireLayoutJobIdentity,
  QUIRE_LAYOUT_JOB_PROTOCOL_VERSION
} from "./protocol";
import type {
  QuireLayoutJobCoordinationOutcome,
  QuireLayoutJobCoordinator,
  QuireLayoutJobCoordinatorCounters,
  QuireLayoutJobCoordinatorOptions,
  QuireLayoutJobRequest,
  QuireLayoutJobResult
} from "./types";

/** Mutable coordinator counter bag. */
type MutableCoordinatorCounters = {
  -readonly [Key in keyof QuireLayoutJobCoordinatorCounters]: QuireLayoutJobCoordinatorCounters[Key];
};

/**
 * Creates the main-thread freshness authority for asynchronous layout jobs.
 *
 * @param options - Executor and current mounted revision reader.
 * @returns Layout job coordinator.
 */
export function createQuireLayoutJobCoordinator(
  options: QuireLayoutJobCoordinatorOptions
): QuireLayoutJobCoordinator {
  const latestJobByScope = new Map<string, string>();
  const activeRequests = new Map<string, QuireLayoutJobRequest>();
  const counters: MutableCoordinatorCounters = {
    submitted: 0,
    completed: 0,
    accepted: 0,
    cancellationRequests: 0,
    canceled: 0,
    failed: 0,
    protocolMismatches: 0,
    invalidResults: 0,
    staleStateResults: 0,
    staleLayoutResults: 0,
    supersededResults: 0,
    destroyedResults: 0
  };
  let destroyed = false;

  return {
    async submit(
      request: QuireLayoutJobRequest
    ): Promise<QuireLayoutJobCoordinationOutcome> {
      const previousJobId = latestJobByScope.get(request.supersessionScope);
      if (previousJobId !== undefined && activeRequests.has(previousJobId)) {
        options.executor.cancel(previousJobId);
        counters.cancellationRequests += 1;
      }
      latestJobByScope.set(request.supersessionScope, request.jobId);
      activeRequests.set(request.jobId, request);
      counters.submitted += 1;

      const result = await options.executor.submit(request);
      activeRequests.delete(request.jobId);
      counters.completed += 1;
      return classifyResult(request, result);
    },
    snapshot(): QuireLayoutJobCoordinatorCounters {
      return { ...counters };
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      for (const jobId of activeRequests.keys()) {
        options.executor.cancel(jobId);
        counters.cancellationRequests += 1;
      }
      activeRequests.clear();
      options.executor.destroy();
    }
  };

  /**
   * Applies protocol, freshness, and supersession authority to one completion.
   *
   * @param request - Submitted request.
   * @param result - Executor completion.
   * @returns Accepted or rejected outcome.
   */
  function classifyResult(
    request: QuireLayoutJobRequest,
    result: QuireLayoutJobResult
  ): QuireLayoutJobCoordinationOutcome {
    if (destroyed) {
      counters.destroyedResults += 1;
      return { accepted: false, reason: "destroyed", result };
    }
    if (
      request.protocolVersion !== QUIRE_LAYOUT_JOB_PROTOCOL_VERSION
      || result.protocolVersion !== QUIRE_LAYOUT_JOB_PROTOCOL_VERSION
    ) {
      counters.protocolMismatches += 1;
      return { accepted: false, reason: "protocol-mismatch", result };
    }
    if (!matchesQuireLayoutJobIdentity(request, result)) {
      counters.invalidResults += 1;
      return { accepted: false, reason: "invalid-result", result };
    }
    if (result.status === "canceled") {
      counters.canceled += 1;
      return { accepted: false, reason: "canceled", result };
    }
    if (result.status === "failed") {
      counters.failed += 1;
      return { accepted: false, reason: "failed", result };
    }
    const currentRevision = options.readCurrentRevision();
    if (request.stateVersion !== currentRevision.stateVersion) {
      counters.staleStateResults += 1;
      return { accepted: false, reason: "stale-state", result };
    }
    if (request.layoutEpoch !== currentRevision.layoutEpoch) {
      counters.staleLayoutResults += 1;
      return { accepted: false, reason: "stale-layout", result };
    }
    if (latestJobByScope.get(request.supersessionScope) !== request.jobId) {
      counters.supersededResults += 1;
      return { accepted: false, reason: "superseded", result };
    }
    counters.accepted += 1;
    return { accepted: true, result };
  }
}
