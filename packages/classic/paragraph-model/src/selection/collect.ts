import type { QuireEditorState } from "@quirekit/core";
import type {
  EditorState as PMEditorState,
  Node as ProseMirrorNode,
  Selection
} from "@quirekit/pm";

/** One selected textblock and its absolute document position. */
export interface SelectedWordParagraph {
  /** Absolute position immediately before the textblock node. */
  readonly position: number;
  /** Selected paragraph or heading node. */
  readonly node: ProseMirrorNode;
}

/** Minimal editor-state projection required by paragraph selection queries. */
export type WordParagraphSelectionState =
  | PMEditorState
  | Pick<QuireEditorState, "pm" | "doc">;

/**
 * Resolves the active selection from a public editor snapshot or PM state.
 *
 * @param state - Editor snapshot or Tiptap command state.
 * @returns ProseMirror selection owned by the supplied state.
 */
export function resolveWordParagraphSelection(
  state: WordParagraphSelectionState
): Selection {
  return "pm" in state ? state.pm.selection : state.selection;
}

/**
 * Collects paragraph-like textblocks covered by the current selection.
 *
 * @param state - Current editor state and selection.
 * @param nodeNames - Registered textblock node names owned by Word formatting.
 * @returns Stable document-order paragraph targets.
 */
export function collectSelectedWordParagraphs(
  state: WordParagraphSelectionState,
  nodeNames: readonly string[]
): readonly SelectedWordParagraph[] {
  const allowed = new Set(nodeNames);
  const selection = resolveWordParagraphSelection(state);
  if (selection.empty) {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      const node = selection.$from.node(depth);
      if (node.isTextblock && allowed.has(node.type.name)) {
        return [{ position: selection.$from.before(depth), node }];
      }
    }
    return [];
  }

  // Structural selections own disjoint ranges. Their envelope includes unselected
  // cells, while Selection.from/to only describe the first range. Visit each exact
  // range and deduplicate paragraphs so every command writes each target once.
  const targets = new Map<number, SelectedWordParagraph>();
  for (const { $from, $to } of selection.ranges) {
    state.doc.nodesBetween($from.pos, $to.pos, (node, position) => {
      if (!node.isTextblock || !allowed.has(node.type.name)) return true;
      targets.set(position, { position, node });
      return false;
    });
  }
  return [...targets.values()].sort((left, right) => left.position - right.position);
}
