import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";

/** Semantic ownership of hidden source, independent of DOM decoration shape. */
export type EditingBoundaryKind = "style" | "block" | "prefix" | "separator" | "syntax" | "atom";

/** Current source interval and its editable interior, never a second content model. */
export interface EditingBoundary {
  /** Start of the complete semantic owner. */
  readonly from: number;
  /** End of the complete semantic owner. */
  readonly to: number;
  /** First editable source position. */
  readonly contentFrom: number;
  /** Last editable source position. */
  readonly contentTo: number;
  /** Ownership determines exterior navigation and whole-object deletion. */
  readonly kind: EditingBoundaryKind;
  /** Start of a larger owner required for whole-object removal, such as a table containing this separator. */
  readonly selectFrom?: number;
  /** End of the same whole-object removal owner. Defaults to this boundary's end. */
  readonly selectTo?: number;
  /** Content enters styles directly and clamps block shells to content; split keeps exterior and interior style stops. */
  readonly navigation?: "content" | "split" | "native";
  /** Unwrap removes the shell at a collapsed edge; protect preserves it; native delegates edits. */
  readonly deletion?: "unwrap" | "protect" | "native";
}

/** Pure feature query at one canonical endpoint. */
export interface EditingBoundaryContext {
  /** Accepted immutable Markdown state. */
  readonly state: EditorState;
  /** Confirmed Markdown node, excluding embedded-language overlays. */
  readonly node: SyntaxNode;
  /** Endpoint or changed-range position being resolved. */
  readonly position: number;
}

/** Feature-owned facts consumed by the shared navigation and editing runtime. */
export interface EditingBoundaryRule {
  /** Syntax owners; the first declaration for a name wins by extension precedence. */
  readonly nodes: readonly string[];
  /** Hidden syntax only by default; prose also covers always-collapsed separators. */
  readonly when?: "hidden" | "prose";
  /** @param context - Current source facts. @returns A complete owner, or null when syntax remains literal. */
  readonly resolve: (context: EditingBoundaryContext) => EditingBoundary | null;
}

/** @param state - Accepted source state. @param from - Query start. @param to - Query end. @returns Indexed rendered objects intersecting this query only. */
export type EditingBoundarySource = (state: EditorState, from: number, to: number) => readonly EditingBoundary[];
