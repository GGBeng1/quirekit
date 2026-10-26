/** Decoded first-definition semantics; source remains owned by the document. */
export interface MarkdownReference {
  /** Normalized case-insensitive label. */
  readonly label: string;
  /** Decoded and URI-normalized destination; consumers must still apply their URL policy. */
  readonly url: string;
  /** Decoded optional title. */
  readonly title: string;
}

/** Incomplete parsing cannot be confused with a missing definition. */
export type MarkdownReferenceResult = { readonly status: "pending" | "missing" }
  | { readonly status: "resolved"; readonly definition: MarkdownReference };

/** Actual work for one immutable syntax snapshot, shared by consumers of that snapshot. */
export interface MarkdownReferenceWork {
  /** Maps materialized for this tree; zero when an equivalent summary already owns one. */
  readonly builds: number;
  /** Newly inspected nodes in changed syntax chunks. */
  readonly visitedNodes: number;
  /** Retained syntax subtrees reused without reading their source. */
  readonly reusedChunks: number;
  /** Definitions whose source fields were actually read on this snapshot. */
  readonly definitionsRead: number;
  /** Definition entries copied while combining immutable chunk summaries. */
  readonly copiedDefinitions: number;
  /** Shared child links retained by new summary branches; excludes descendant copying. */
  readonly summaryLinks: number;
  /** Number of accepted unique labels. */
  readonly definitions: number;
}
