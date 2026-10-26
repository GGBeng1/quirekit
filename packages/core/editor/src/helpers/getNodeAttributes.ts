import type { EditorState as PMEditorState, Node as PMNode, NodeType } from "@quirekit/pm";
import { getNodeType } from "./getNodeType";

/**
 * Reads active node attributes from the current selection.
 *
 * @param state - Current ProseMirror state.
 * @param typeOrName - Node type or name.
 * @returns Active node attributes, or an empty object.
 */
export function getNodeAttributes(
  state: PMEditorState,
  typeOrName: string | NodeType
): Record<string, unknown> {
  const type = getNodeType(typeOrName, state.schema);
  const nodes: PMNode[] = [];

  state.doc.nodesBetween(state.selection.from, state.selection.to, (node) => {
    nodes.push(node);
  });

  return { ...(nodes.reverse().find((node) => node.type.name === type.name)?.attrs ?? {}) };
}
