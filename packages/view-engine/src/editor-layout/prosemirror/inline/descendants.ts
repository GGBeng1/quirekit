import type { Node as ProseMirrorNode } from "@quirekit/pm";

/**
 * Visits text and leaf/atomic inline sources through transparent containers.
 *
 * ProseMirror allocates one position to each opening and closing token of a
 * non-leaf inline node. Descendant offsets therefore include the opening token
 * while the transparent wrapper itself contributes no layout source.
 *
 * @param node - Textblock or transparent inline container to traverse.
 * @param visitor - Consumer receiving renderable descendants and root offsets.
 */
export function visitInlineDescendants(
  node: ProseMirrorNode,
  visitor: (child: ProseMirrorNode, offset: number) => void
): void {
  node.descendants(
    /**
     * Lets PM own nested source offsets while atomic sources stop traversal.
     * @param child - Candidate inline descendant.
     * @param offset - PM-owned offset within root content.
     * @returns Whether a transparent container should expose its children.
     */
    (child, offset): boolean => {
      if (child.isInline && !child.isLeaf && child.type.spec.atom !== true) return true;
      visitor(child, offset);
      return false;
    }
  );
}
/**
 * Checks whether an inline node declares a forced page or column boundary.
 *
 * @param node - Inline child to inspect.
 * @returns Whether the node is a page or column break.
 */
export function isQuireForcedInlineBreak(node: ProseMirrorNode): boolean {
  const kind = node.type.spec.quireInlineBreak;
  return kind === "page" || kind === "column";
}
