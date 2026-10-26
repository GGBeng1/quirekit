import type {
  CombinedProofingOptions,
  ProofingCapabilities,
  ProofingIssueKind,
  ProofingProvider,
  ProofingProviderIssue
} from "../types";

/** Separates the source provider id from a finding's own rule id. */
const ruleSeparator = "\u0000";

/**
 * Runs several providers as one, for example a dictionary for spelling and Harper for grammar.
 *
 * Members are checked concurrently, each with the segments in languages it
 * supports. When findings of the same category overlap, the one from the
 * earlier member wins. Findings remember their member in `ruleId`, so lazy
 * suggestions are asked from the member that reported them.
 *
 * @param providers - Members in priority order.
 * @param options - Failure callback.
 * @returns Combined provider.
 */
export function combineProofingProviders(
  providers: readonly ProofingProvider[],
  options: CombinedProofingOptions = {}
): ProofingProvider {
  const capabilities = providers.map((provider) => provider.getCapabilities?.() ?? null);
  /**
   * @param index - Member index.
   * @param language - Segment language.
   * @returns Whether the member checks the language.
   */
  const supports = (index: number, language: string | null): boolean => {
    const filter = capabilities[index]?.supportsLanguage;
    return filter === undefined || (language !== null && filter(language));
  };
  return {
    id: providers.map((provider) => provider.id).join("+"),
    getCapabilities: (): ProofingCapabilities => ({
      issueKinds: [...new Set<ProofingIssueKind>(capabilities.flatMap((value) => value?.issueKinds ?? ["spelling", "grammar", "style"]))],
      supportsLanguage: (language) => providers.some((_, index) => supports(index, language)),
      requiresNetwork: capabilities.some((value) => value?.requiresNetwork === true)
    }),
    check: async (request) => {
      const results = await Promise.allSettled(providers.map((provider, index) => {
        const segments = request.segments.filter((segment) => supports(index, segment.language ?? request.defaultLanguage));
        return segments.length === 0 ? Promise.resolve({ issues: [] }) : provider.check({ ...request, segments });
      }));
      request.signal.throwIfAborted();
      const kept: ProofingProviderIssue[] = [];
      let failure: unknown = null;
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          failure ??= result.reason;
          options.onProviderError?.({ kind: "provider-error", message: String(result.reason), cause: result.reason }, providers[index]!);
          return;
        }
        for (const issue of result.value.issues) {
          if (kept.some((other) => overlaps(other, issue))) continue;
          kept.push({ ...issue, ruleId: `${providers[index]!.id}${ruleSeparator}${issue.ruleId ?? ""}` });
        }
      });
      if (failure !== null && results.every((result) => result.status === "rejected")) throw failure;
      return { issues: kept };
    },
    suggest: async (request) => {
      const [id, ...rest] = (request.ruleId ?? "").split(ruleSeparator);
      const provider = providers.find((candidate) => candidate.id === id);
      if (provider?.suggest === undefined) return [];
      const ruleId = rest.join(ruleSeparator);
      return provider.suggest({ ...request, ruleId: ruleId === "" ? undefined : ruleId });
    },
    setUserWords: async (words) => {
      await Promise.all(providers.map((provider) => provider.setUserWords?.(words)));
    },
    dispose: async () => {
      await Promise.all(providers.map((provider) => provider.dispose?.()));
    }
  };
}

/**
 * Tests whether two findings of the same category cover a common character.
 *
 * @param left - Kept finding.
 * @param right - Candidate finding.
 * @returns Whether the candidate duplicates the kept finding.
 */
function overlaps(left: ProofingProviderIssue, right: ProofingProviderIssue): boolean {
  return left.segmentId === right.segmentId && left.kind === right.kind
    && left.start < right.end && right.start < left.end;
}
