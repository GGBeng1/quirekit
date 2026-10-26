import type { ProofingExtensionOptions, ProofingIssue, ProofingProvider } from "../types";
import { withProofingTimeout } from "./request";

/** Suggestion lists remembered per provider, language, kind, and text. */
const maxCachedSuggestions = 500;

/** Lazily requested and cached replacements. */
export class ProofingSuggestions {
  private readonly cache = new Map<string, readonly string[]>();

  /** @param options - Extension options providing limits. */
  constructor(private readonly options: ProofingExtensionOptions) {}

  /**
   * Returns replacements for a finding, asking the provider only when the finding carried none.
   *
   * @param provider - Current provider.
   * @param issue - Finding.
   * @param signal - Optional caller abort signal.
   * @returns Replacements, best first.
   */
  async suggest(provider: ProofingProvider | null, issue: ProofingIssue, signal?: AbortSignal): Promise<readonly string[]> {
    if (issue.replacements !== undefined && issue.replacements.length > 0) return issue.replacements;
    if (provider?.suggest === undefined) return [];
    const language = issue.language ?? this.options.defaultLanguage;
    const key = `${provider.id}\u0000${language ?? ""}\u0000${issue.kind}\u0000${issue.text}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const suggestions = await withProofingTimeout(provider.suggest({
        text: issue.text,
        language,
        kind: issue.kind,
        ...(issue.ruleId === undefined ? {} : { ruleId: issue.ruleId }),
        maxSuggestions: this.options.maxSuggestions,
        signal: controller.signal
      }), this.options.timeoutMs, controller);
      const limited = suggestions.slice(0, this.options.maxSuggestions);
      this.cache.set(key, limited);
      if (this.cache.size > maxCachedSuggestions) this.cache.delete(this.cache.keys().next().value!);
      return limited;
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }

  /** Forgets every cached list, for example after a provider change. */
  clear(): void {
    this.cache.clear();
  }
}
