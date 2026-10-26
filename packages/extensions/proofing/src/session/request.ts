import { mapSegmentRange } from "../extract/offsets";
import type { ExtractedProofingBlock } from "../extract/types";
import type { ProofingBlockResult } from "../plugin/types";
import type {
  ProofingIssue,
  ProofingIssueKind,
  ProofingProvider,
  ProofingProviderIssue,
  ProofingSegment
} from "../types";

/** Provider finding stored per block content key, independent of positions. */
export interface ProofingCachedIssue {
  /** Index of the segment inside its block. */
  readonly segment: number;
  /** Provider finding relative to that segment. */
  readonly issue: ProofingProviderIssue;
}

/** Validated answer for one block. */
export interface ProofingAnsweredBlock {
  /** Block as extracted. */
  readonly block: ExtractedProofingBlock;
  /** Findings in segment offsets. */
  readonly issues: readonly ProofingCachedIssue[];
}

/** Error raised when a provider call exceeds its time limit. */
export class ProofingTimeoutError extends Error {
  /** @param timeoutMs - Exceeded limit. */
  constructor(timeoutMs: number) {
    super(`Proofing provider did not answer within ${timeoutMs} ms`);
    this.name = "ProofingTimeoutError";
  }
}

/** Valid finding categories. */
const issueKinds = new Set<ProofingIssueKind>(["spelling", "grammar", "style"]);

/** Session-wide finding identity counter. */
let issueCounter = 0;

/**
 * Settles a promise or fails after a time limit, aborting the controller.
 *
 * The timeout does not rely on the provider honoring the abort signal, so a
 * hung provider can never hold a concurrency slot.
 *
 * @param promise - Provider call.
 * @param timeoutMs - Time limit.
 * @param controller - Controller aborted on timeout.
 * @returns Provider result.
 */
export function withProofingTimeout<T>(promise: Promise<T>, timeoutMs: number, controller: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new ProofingTimeoutError(timeoutMs);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/**
 * Sends a batch of blocks to the provider and validates the answer.
 *
 * @param provider - Provider.
 * @param blocks - Blocks of the batch.
 * @param supports - Language filter.
 * @param defaultLanguage - Language of segments without one.
 * @param maxSuggestions - Suggestions per finding.
 * @param signal - Abort signal.
 * @returns Answers per block and the number of rejected findings.
 */
export async function requestProofingBatch(
  provider: ProofingProvider,
  blocks: readonly ExtractedProofingBlock[],
  supports: (language: string | null) => boolean,
  defaultLanguage: string | null,
  maxSuggestions: number,
  signal: AbortSignal
): Promise<{ readonly answers: ProofingAnsweredBlock[]; readonly rejected: number }> {
  const segments: ProofingSegment[] = [];
  blocks.forEach((block, blockIndex) => block.segments.forEach((segment, segmentIndex) => {
    if (!supports(segment.language)) return;
    segments.push({
      id: `${blockIndex}:${segmentIndex}`,
      text: segment.text,
      language: segment.language,
      surface: block.surface ?? "other",
      startsBlock: segment.startsBlock
    });
  }));
  const result = await provider.check({ segments, defaultLanguage, maxSuggestions, signal });
  const answers = blocks.map((block) => ({ block, issues: [] as ProofingCachedIssue[] }));
  let rejected = 0;
  for (const issue of Array.isArray(result?.issues) ? result.issues : []) {
    const [blockIndex, segmentIndex] = String(issue.segmentId).split(":").map(Number);
    const answer = answers[blockIndex ?? -1];
    const segment = answer?.block.segments[segmentIndex ?? -1];
    if (answer === undefined || segment === undefined || !issueKinds.has(issue.kind)
      || mapSegmentRange(segment, issue.start, issue.end) === null) {
      rejected += 1;
      continue;
    }
    answer.issues.push({ segment: segmentIndex!, issue });
  }
  return { answers, rejected };
}

/**
 * Converts cached findings of a block into document findings.
 *
 * @param block - Block as extracted now.
 * @param issues - Findings in segment offsets.
 * @param defaultLanguage - Language of segments without one.
 * @param maxSuggestions - Suggestions per finding.
 * @returns Findings in the block's extraction-time positions.
 */
export function toBlockResult(
  block: ExtractedProofingBlock,
  issues: readonly ProofingCachedIssue[],
  defaultLanguage: string | null,
  maxSuggestions: number
): ProofingBlockResult {
  const converted: ProofingIssue[] = [];
  for (const { segment: index, issue } of issues) {
    const segment = block.segments[index];
    const range = segment === undefined ? null : mapSegmentRange(segment, issue.start, issue.end);
    if (segment === undefined || range === null) continue;
    issueCounter += 1;
    converted.push({
      id: `proofing-${issueCounter}`,
      from: range.from,
      to: range.to,
      kind: issue.kind,
      text: segment.text.slice(issue.start, issue.end),
      language: segment.language ?? defaultLanguage,
      ...(issue.message === undefined ? {} : { message: issue.message }),
      ...(issue.replacements === undefined ? {} : { replacements: issue.replacements.slice(0, maxSuggestions) }),
      ...(issue.ruleId === undefined ? {} : { ruleId: issue.ruleId })
    });
  }
  return { from: block.from, to: block.to, issues: converted };
}
