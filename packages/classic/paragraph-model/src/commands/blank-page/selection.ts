import type { CommandProps } from "@quirekit/core";
import {
  TextSelection,
  type Mark,
  type Node as ProseMirrorNode
} from "@quirekit/pm";

/**
 * Finds the configured paragraph-like textblock containing a resolved position.
 *
 * @param position - Resolved selection head.
 * @param allowedNodeNames - Configured paragraph-like textblock names.
 * @returns Matching depth, or null outside the admitted domain.
 */
export function findAllowedTextblockDepth(
  position: TextSelection["$head"],
  allowedNodeNames: ReadonlySet<string>
): number | null {
  for (let depth = position.depth; depth > 0; depth -= 1) {
    const node = position.node(depth);
    if (node.isTextblock && allowedNodeNames.has(node.type.name)) return depth;
  }
  return null;
}

/**
 * Restricts physical-page insertion to document or Word main-story block flow.
 *
 * @param parent - Parent of the active paragraph-like block.
 * @returns Whether the parent owns main-story block flow.
 */
export function isMainStoryBlockParent(parent: ProseMirrorNode): boolean {
  return parent.type.name === "doc" || parent.type.name === "wordSection";
}

/**
 * Retains only marks whose extension contract allows block continuation.
 *
 * @param context - Active editor command context.
 * @param marks - Marks active at the insertion position.
 */
export function preserveSplittableMarks(
  context: CommandProps,
  marks: readonly Mark[]
): void {
  const allowedMarks = context.editor.extensionManager.splittableMarks;
  context.tr.ensureMarks(
    marks.filter((mark) => allowedMarks.includes(mark.type.name))
  );
}
