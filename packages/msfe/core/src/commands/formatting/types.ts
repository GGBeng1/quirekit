import type { SyntaxNode } from "@lezer/common";
import type { ChangeSpec, SelectionRange } from "@quirekit/cm-state";

/** Grammar owned by a semantic paired-mark feature. */
export interface SourceMarkFormat {
  /** Parser node representing the requested format. */ readonly node: string;
  /** Preferred source spelling when adding the format. */ readonly marker: string;
  /** Direct opening/closing child node name. */ readonly markerNode: string;
}
/** One common inline owner, or an explanation of why formatting is unavailable. */
export interface SourceInlineQuery {
  /** Accepted paragraph, heading or single table cell. */ readonly node: SyntaxNode | null;
  /** A structural refusal; null means this range is eligible for an explicit command. */
  readonly reason: "readonly" | "unparsed" | "structure" | "literal" | "selection" | null;
}
/** A parsed paired source owner, independent of its visual decoration. */
export interface SourceMarkSpan {
  /** Complete syntax owner. */ readonly node: SyntaxNode;
  /** Inclusive first body character. */ readonly from: number;
  /** Exclusive last body character. */ readonly to: number;
}
/** One range's unpublished formatting plan. */
export interface SourceMarkPlan {
  /** Changes expressed in the original document. */ readonly changes: readonly ChangeSpec[];
  /** Directed selection after these changes only. */ readonly range: SelectionRange;
  /** First source position owned by this operation. */ readonly from: number;
  /** Last source position owned by this operation. */ readonly to: number;
}
