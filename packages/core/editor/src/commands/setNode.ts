import {
  setBlockType as pmSetBlockType,
  type NodeType
} from "@quirekit/pm";
import { getNodeType } from "../helpers";
import { filterNodeAttributes } from "./node-attrs";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";
import { BlockSelection } from "../block-interaction/selection";
import { setBlockSelectionType } from "../block-interaction/formatting";

/**
 * Changes the current textblock to another textblock node type.
 *
 * @param context - Current command execution context.
 * @param typeOrName - Textblock node type or node type name.
 * @param attributes - Optional node attributes.
 * @returns Whether ProseMirror changed the block type.
 */
export const setNode: CommandSpec = (typeOrName, attributes = {}) => (context) => {
  if (typeof typeOrName !== "string" && typeof typeOrName !== "object") {
    return false;
  }

  const type = getNodeType(typeOrName as NodeType | string, context.state.schema);

  if (!type.isTextblock) {
    console.warn('[quirekit warn]: Currently "setNode()" only supports text block nodes.');

    return false;
  }

  if (context.tr.selection instanceof BlockSelection) {
    return setBlockSelectionType(context, type, attributes as Record<string, unknown>);
  }

  const attributesToCopy = context.tr.selection.$anchor.sameParent(context.tr.selection.$head)
    ? context.tr.selection.$anchor.parent.attrs
    : undefined;
  const nextAttributes = filterNodeAttributes(type, {
    ...(attributesToCopy ?? {}),
    ...(attributes as Record<string, unknown>)
  });

  return runProseMirrorCommand(
    context,
    pmSetBlockType(type, nextAttributes)
  );
};
