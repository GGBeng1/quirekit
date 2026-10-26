import type {
  QuireLayoutJobRequest,
  QuireLayoutJobResult
} from "./types";

/** Current clone-safe layout acceleration protocol version. */
export const QUIRE_LAYOUT_JOB_PROTOCOL_VERSION = 1;

/**
 * Reports whether an executor result echoes one submitted request identity.
 *
 * @param request - Submitted request.
 * @param result - Executor result to validate.
 * @returns Whether job id and revision facts match exactly.
 */
export function matchesQuireLayoutJobIdentity(
  request: QuireLayoutJobRequest,
  result: QuireLayoutJobResult
): boolean {
  return result.jobId === request.jobId
    && result.stateVersion === request.stateVersion
    && result.layoutEpoch === request.layoutEpoch;
}

/**
 * Creates a canceled result echoing one request identity.
 *
 * @param request - Canceled request.
 * @returns Clone-safe canceled result.
 */
export function createQuireCanceledLayoutJobResult(request: QuireLayoutJobRequest): QuireLayoutJobResult {
  return {
    status: "canceled",
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: request.jobId,
    stateVersion: request.stateVersion,
    layoutEpoch: request.layoutEpoch
  };
}
