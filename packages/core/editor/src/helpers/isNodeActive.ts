import type { EditorState as PMEditorState, Node as PMNode, NodeType } from "@quirekit/pm";
import { objectIncludes } from "../utilities/objectIncludes";
import { getNodeType } from "./getNodeType";

/** Active node range used for node active checks. */
interface NodeActiveRange {
  /** Node in the checked range. */
  readonly node: PMNode;
  /** Inclusive range start. */
  readonly from: number;
  /** Exclusive range end. */
  readonly to: number;
}

/**
 * Reports whether a node is active at the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param typeOrName - Node type, node name, or null for any node.
 * @param attributes - Attribute subset to match.
 * @returns Whether a matching node is active.
 */
export function isNodeActive(
  state: PMEditorState,
  typeOrName: NodeType | string | null,
  attributes: Record<string, unknown> = {}
): boolean {
  const { from, to, empty, $from } = state.selection;
  const type = typeOrName ? getNodeType(typeOrName, state.schema) : null;
  const nodeRanges: NodeActiveRange[] = [];

  if (empty && !$from.parent.isText) {
    nodeRanges.push({
      node: $from.parent,
      from: $from.start(),
      to: $from.end()
    });
  }

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      return;
    }

    nodeRanges.push({
      node,
      from: Math.max(from, pos),
      to: Math.min(to, pos + node.nodeSize)
    });
  });

  const matches = nodeRanges
    .filter((range) => !type || range.node.type.name === type.name)
    .filter((range) => objectIncludes(range.node.attrs, attributes, { strict: false }));

  if (empty) {
    return matches.length > 0;
  }

  return matches.reduce((sum, range) => sum + range.to - range.from, 0) >= to - from;
}
