/** Current immutable abbreviation resolution, shared by viewport consumers. */
export interface AbbreviationIndex {
  /** Whether the accepted syntax covers the document. */
  readonly status: "ready" | "pending";
  /** First definition of each exact case-sensitive abbreviation. */
  readonly definitions: ReadonlyMap<string, string>;
  /** Longest-first escaped matcher, recreated only with a new definition index. */
  readonly pattern: string | null;
}
