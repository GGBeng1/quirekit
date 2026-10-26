import type {
  ProofingIssueKind,
  ProofingProvider,
  ProofingProviderIssue
} from "@quirekit/extension-proofing";
import { Dialect, type Linter } from "harper.js";
import { projectHarperIssue } from "./issues";
import { createHarperLinter } from "./linter";
import { resolveHarperDialect } from "./mapping";
import type { HarperProofingOptions } from "./types";

/**
 * Creates an English grammar and style provider backed by Harper.
 *
 * The default worker is shared across dialects and allocated on first use.
 * Host-provided linters keep their per-dialect identity and configuration.
 *
 * @param options - Linter factory and reported categories.
 * @returns Provider; suggestions come with each finding.
 */
export function createHarperProofingProvider(options: HarperProofingOptions = {}): ProofingProvider {
  const kinds = new Set<ProofingIssueKind>(options.issueKinds ?? ["grammar"]);
  const shared = options.createLinter === undefined ? createHarperLinter() : undefined;
  const linters = new Map<Dialect, Linter>();
  let disposed = false;
  let closing: Promise<void> | undefined;

  /**
   * Returns the linter of a dialect.
   *
   * @param dialect - Harper dialect.
   * @returns Shared linter.
   */
  const linterFor = (dialect: Dialect): Linter => {
    let linter = linters.get(dialect);
    if (linter === undefined) {
      linter = options.createLinter!(dialect);
      linters.set(dialect, linter);
    }
    return linter;
  };

  if (options.preload === true) {
    // Preloading has no caller to receive errors; actual checks still report
    // initialization failures through the provider's normal rejection path.
    void Promise.resolve().then(() => {
      if (disposed) return;
      return shared?.setup() ?? linterFor(Dialect.American).setup();
    }).catch(() => {});
  }

  return {
    id: "harper",
    getCapabilities: () => ({
      issueKinds: [...kinds],
      supportsLanguage: (language) => resolveHarperDialect(language) !== null
    }),
    check: async (request) => {
      if (disposed) throw new Error("Harper provider is disposed");
      const issues: ProofingProviderIssue[] = [];
      for (const segment of request.segments) {
        if (disposed) throw new Error("Harper provider is disposed");
        request.signal.throwIfAborted();
        const dialect = resolveHarperDialect(segment.language ?? request.defaultLanguage ?? "");
        if (dialect === null) continue;
        const lints = await (shared?.lint(dialect, segment.text, request.signal)
          ?? linterFor(dialect).lint(segment.text, { language: "plaintext" }));
        // The worker answer owns WASM handles even when cancellation made it
        // obsolete. Copy only public values, then release the entire batch.
        try {
          request.signal.throwIfAborted();
          for (const lint of lints) {
            const issue = projectHarperIssue(lint, segment, kinds, request.maxSuggestions);
            if (issue !== null) issues.push(issue);
          }
        } finally {
          for (const lint of lints) lint.free();
        }
      }
      return { issues };
    },
    dispose: () => {
      if (closing !== undefined) return closing;
      disposed = true;
      const owned = [...linters.values()];
      linters.clear();
      closing = shared?.dispose() ?? Promise.all(owned.map(linter =>
        (linter as Linter & { dispose?: () => unknown }).dispose?.()
      )).then(() => {});
      return closing;
    }
  };
}
