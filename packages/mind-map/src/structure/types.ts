import type { MindMapDocument, MindMapNode } from "../model/types";

/** Portable structural intents shared by UI, keyboard and programmatic consumers. */
export type MindMapStructureCommand = "add-parent" | "indent" | "outdent" | "move-up" | "move-down"
  | "expand-selected" | "collapse-selected" | "expand-all" | "collapse-all";

/** One atomic structural result, independent of renderer and host revision. */
export interface MindMapStructureResult {
  /** Unchanged input identity for a no-op, otherwise a validated immutable forest. */ readonly document: MindMapDocument;
  /** Topic identities to retain after rendering; invisible descendants may be omitted by the renderer. */ readonly selectedIds: readonly string[];
}

/** Private editable copy; never escapes the canonical validation boundary. */
export type MutableMindMapNode = { -readonly [Key in keyof MindMapNode]: Key extends "children" ? MutableMindMapNode[] : MindMapNode[Key] };

/** Structural location within one main or independent tree. */
export interface MindMapStructureLocation {
  /** Matched topic. */ readonly node: MutableMindMapNode;
  /** Owning parent, absent at each tree root. */ readonly parent?: MutableMindMapNode;
  /** Parent's owner, absent for direct children. */ readonly grandparent?: MutableMindMapNode;
}
