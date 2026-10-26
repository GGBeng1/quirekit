import type { ExtractedProofingBlock } from "../extract/types";
import type { ProofingBlockResult } from "../plugin/types";
import type { ProofingError, ProofingExtensionOptions, ProofingProvider } from "../types";
import type { ProofingResultCache } from "./cache";
import { ProofingTimeoutError, requestProofingBatch, withProofingTimeout } from "./request";

/** Session callbacks receiving the outcome of one request. */
export interface ProofingRequestOutcome {
  /**
   * Reports whether failures of this request still matter, for example after a provider switch.
   *
   * @returns Whether to report a failure.
   */
  readonly isCurrent: () => boolean;
  /**
   * Tests whether the provider checks a segment language.
   *
   * @param language - Segment language.
   * @returns Whether to send the segment.
   */
  readonly supports: (language: string | null) => boolean;
  /**
   * Receives validated findings.
   *
   * @param blocks - Block results.
   */
  readonly answered: (blocks: readonly ProofingBlockResult[]) => void;
  /**
   * Receives a failure, or null when the request was aborted on purpose.
   *
   * @param error - Failure to report.
   */
  readonly failed: (error: ProofingError | null) => void;
}

/**
 * Runs one provider request with an enforced timeout and validates its answer.
 *
 * @param provider - Provider at scheduling time.
 * @param blocks - Blocks of the request.
 * @param controller - Abort controller of the request.
 * @param options - Extension options.
 * @param cache - Result cache receiving the answer.
 * @param outcome - Session callbacks.
 */
export async function sendProofingRequest(
  provider: ProofingProvider,
  blocks: readonly ExtractedProofingBlock[],
  controller: AbortController,
  options: ProofingExtensionOptions,
  cache: ProofingResultCache,
  outcome: ProofingRequestOutcome
): Promise<void> {
  try {
    const { answers, rejected } = await withProofingTimeout(requestProofingBatch(
      provider, blocks, outcome.supports, options.defaultLanguage, options.maxSuggestions, controller.signal
    ), options.timeoutMs, controller);
    if (rejected > 0) {
      options.onError?.({ kind: "validation-error", message: `Proofing provider returned ${rejected} invalid findings` });
    }
    for (const answer of answers) cache.remember(answer.block, answer.issues);
    outcome.answered(answers.map((answer) => cache.toResult(answer.block, answer.issues)));
  } catch (error) {
    const timedOut = error instanceof ProofingTimeoutError;
    const reportable = outcome.isCurrent() && (timedOut || !controller.signal.aborted);
    outcome.failed(reportable ? { kind: timedOut ? "timeout" : "provider-error", message: String(error), cause: error } : null);
  }
}
