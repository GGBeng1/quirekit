import type {
  EditorState as PMEditorState,
  Node as PMNode,
  NodeType
} from "@quirekit/pm";
import { getNodeType } from "./getNodeType";

/**
 * Finds the closest node of a given type at or above a document position.
 *
 * @param state - Current ProseMirror state.
 * @param typeOrName - Node type object or schema node name.
 * @param pos - Position to resolve before walking ancestors.
 * @param maxDepth - Maximum depth to inspect.
 * @returns Tuple containing the node, when found, and the inspected depth.
 */
export function getNodeAtPosition(
  state: PMEditorState,
  typeOrName: string | NodeType,
  pos: number,
  maxDepth = 20
): [PMNode | null, number] {
  const $pos = state.doc.resolve(pos);
  const nodeType = getNodeType(typeOrName, state.schema);
  let currentDepth = Math.min(maxDepth, $pos.depth);
  let node: PMNode | null = null;

  while (currentDepth > 0 && node === null) {
    const currentNode = $pos.node(currentDepth);

    if (currentNode.type === nodeType) {
      node = currentNode;
    } else {
      currentDepth -= 1;
    }
  }

  return [node, currentDepth];
}
