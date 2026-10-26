import type { ProofingIssueKind } from "@quirekit/extension-proofing";
import type { Dialect, Linter } from "harper.js";

/** Options of the Harper provider. */
export interface HarperProofingOptions {
  /**
   * Creates a dedicated linter for one English dialect, preserving host configuration.
   * Without this factory, a single worker on the bundled slim binary serves all dialects.
   *
   * @param dialect - Harper dialect.
   * @returns Linter used for that dialect.
   */
  readonly createLinter?: ((dialect: Dialect) => Linter) | undefined;
  /** Starts loading the American English linter right away instead of on the first check. */
  readonly preload?: boolean | undefined;
  /** Finding categories reported; defaults to grammar only, leaving spelling to a dictionary and style as an opt-in. */
  readonly issueKinds?: readonly ProofingIssueKind[] | undefined;
}
