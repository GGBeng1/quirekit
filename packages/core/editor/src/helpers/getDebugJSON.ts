import type { Node as PMNode } from "@quirekit/pm";
import type { QuireJSONContent } from "../types";

/** Tiptap-compatible JSON debug node annotated with document positions. */
export interface QuireDebugJSONContent extends QuireJSONContent {
  /** Start position of this node. */
  readonly from: number;
  /** End position of this node. */
  readonly to: number;
}

/**
 * Serializes a ProseMirror node to JSON annotated with absolute positions.
 *
 * @param node - Node to serialize.
 * @param startOffset - Absolute position where this node starts.
 * @returns Debug JSON content.
 */
export function getDebugJSON(
  node: PMNode,
  startOffset = 0
): QuireDebugJSONContent {
  const isTopNode = node.type === node.type.schema.topNodeType;
  const increment = isTopNode ? 0 : 1;
  const from = startOffset;
  const to = from + node.nodeSize;
  const attrs = { ...node.attrs };
  const marks = node.marks.map((mark) => {
    const output: { type: string; attrs?: Record<string, unknown> } = {
      type: mark.type.name
    };

    if (Object.keys(mark.attrs).length > 0) {
      output.attrs = { ...mark.attrs };
    }

    return output;
  });
  const output: {
    type: string;
    from: number;
    to: number;
    attrs?: Record<string, unknown>;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    content?: QuireDebugJSONContent[];
    text?: string;
  } = {
    type: node.type.name,
    from,
    to
  };

  if (Object.keys(attrs).length > 0) {
    output.attrs = attrs;
  }

  if (marks.length > 0) {
    output.marks = marks;
  }

  if (node.content.childCount > 0) {
    output.content = [];
    node.forEach((child, offset) => {
      output.content?.push(getDebugJSON(child, startOffset + offset + increment));
    });
  }

  if (node.text) {
    output.text = node.text;
  }

  return output;
}
