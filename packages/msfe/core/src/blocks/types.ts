import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";
import type { MsfeSourceRange } from "../views/types";

/** Exact source block and its sibling flow; never a second document model. */
export interface SourceBlock extends MsfeSourceRange {
  /** Accepted parser node name. */
  readonly name: string;
  /** Range in which complete sibling blocks may be rearranged. */
  readonly scope: MsfeSourceRange;
}

/** @param state - Accepted source. @param node - Candidate container. @returns Editable child flow, null for unhandled syntax, or false to exclude an incomplete/position-sensitive block. */
export type SourceBlockScopeResolver = (state: EditorState, node: SyntaxNode) => MsfeSourceRange | null | false;

/** Source insertion side relative to a complete block. */
export type SourceBlockSide = "before" | "after";

/** An empty physical line in an admitted block flow, without a synthetic syntax node. */
export interface SourceBlankLine extends MsfeSourceRange {
  /** Editable sibling flow excluding the enclosing delimiters. */ readonly scope: MsfeSourceRange;
}

/** Structural reason why a block cannot replace the current text selection. */
export type SourceBlockInsertionReason = "readonly" | "selection" | "unparsed" | "structure" | "table" | "code" | "list" | "quote" | "inline";

/** One shared decision for command admission and its product explanation. */
export type SourceBlockInsertionQuery = {
  /** Legal replacement range and its admitted sibling flow. */ readonly range: SourceBlankLine;
  /** No structural restriction applies. */ readonly reason: null;
} | {
  /** A rejected selection has no writable block range. */ readonly range: null;
  /** Stable, language-independent rejection reason. */ readonly reason: SourceBlockInsertionReason;
};
