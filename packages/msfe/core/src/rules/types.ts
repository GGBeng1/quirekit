import type { SourceDocument } from "../source/authoring/types";

/** A source rule receives only bounded matching context and returns replacement source. */
export interface RuleMatch {
  /** RegExp capture groups for this occurrence. */
  readonly match: RegExpExecArray;
  /** UTF-16 range of the match in the document after native input. */
  readonly range: { readonly from: number; readonly to: number };
  /** Read-only bounded access to the source after native input. */
  readonly document: SourceDocument;
}

/** Source-native rule; unlike a PM input rule, its output is exact Markdown text. */
export interface RuleConfig {
  /** Pattern matched against the bounded input context. */
  readonly find: RegExp;
  /** @param context - Match, source coordinates and source access. @returns Exact replacement or null to preserve the input. */
  readonly handler: (context: RuleMatch) => string | null;
}
