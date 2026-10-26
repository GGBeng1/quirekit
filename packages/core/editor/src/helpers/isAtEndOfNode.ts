import type { EditorState as PMEditorState, Node as PMNode } from "@quirekit/pm";

/** Parent node match used by end-of-node checks. */
interface QuireParentNodeMatch {
  /** Matched node. */
  readonly node: PMNode;
  /** Document position before the node. */
  readonly pos: number;
}

/**
 * Reports whether the current collapsed selection is at the end of a node.
 *
 * @param state - Current ProseMirror state.
 * @param nodeType - Optional ancestor node type name to inspect.
 * @returns Whether the selection is at the end of the selected node context.
 */
export function isAtEndOfNode(
  state: PMEditorState,
  nodeType?: string | undefined
): boolean {
  const { $from, $to, $anchor } = state.selection;

  if (nodeType) {
    const parentNode = findParentNode($anchor, (node) => node.type.name === nodeType);

    if (!parentNode) {
      return false;
    }

    const $parentPos = state.doc.resolve(parentNode.pos + 1);

    return $anchor.pos === $parentPos.end();
  }

  if ($to.parentOffset < $to.parent.nodeSize - 2 || $from.pos !== $to.pos) {
    return false;
  }

  return true;
}

/**
 * Finds the closest ancestor node that matches a predicate.
 *
 * @param $pos - Position whose ancestors should be inspected.
 * @param predicate - Predicate used to match an ancestor node.
 * @returns Matching node and position, or undefined.
 */
function findParentNode(
  $pos: PMEditorState["selection"]["$anchor"],
  predicate: (node: PMNode) => boolean
): QuireParentNodeMatch | undefined {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);

    if (predicate(node)) {
      return { node, pos: $pos.before(depth) };
    }
  }

  return undefined;
}
