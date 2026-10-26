import type {
  MarkType,
  NodeType
} from "@quirekit/pm";
import {
  getMarkType,
  getNodeType,
  getSchemaTypeNameByName
} from "../helpers";
import { deleteProps } from "../utilities/deleteProps";
import { resolveSchemaTypeName } from "./mark-utils";
import type { QuireAttributeTypeInput } from "./mark-types";
import type { Command } from "../types";

/**
 * Resets selected node or mark attributes back to schema defaults.
 *
 * @param typeOrName - Node or mark type object, or schema type name.
 * @param attributes - Attribute name or names to reset.
 * @returns Command that resets matching attributes.
 */
export function resetAttributes(
  typeOrName: QuireAttributeTypeInput,
  attributes: string | readonly string[]
): Command {
  return ({ state, tr, dispatch }) => {
    const schemaType = getSchemaTypeNameByName(resolveSchemaTypeName(typeOrName), state.schema);

    if (!schemaType) {
      return false;
    }

    const nodeType = schemaType === "node"
      ? getNodeType(typeOrName as string | NodeType, state.schema)
      : null;
    const markType = schemaType === "mark"
      ? getMarkType(typeOrName as string | MarkType, state.schema)
      : null;
    let canReset = false;

    for (const range of tr.selection.ranges) {
      state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
        if (nodeType && nodeType === node.type) {
          canReset = true;
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, deleteProps(node.attrs, attributes));
          }
        }

        if (markType && node.marks.length > 0) {
          for (const mark of node.marks) {
            if (markType === mark.type) {
              canReset = true;
              if (dispatch) {
                tr.addMark(
                  pos,
                  pos + node.nodeSize,
                  markType.create(deleteProps(mark.attrs, attributes))
                );
              }
            }
          }
        }
      });
    }

    return canReset;
  };
}
