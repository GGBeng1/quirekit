import { Transform, type NodeType } from "@quirekit/pm";
import type { CommandProps } from "../types";
import { filterNodeAttributes } from "../commands/node-attrs";
import { BlockSelection } from "./selection";

/**
 * Converts complete text blocks while retaining each member's compatible attributes.
 * @param context - Canonical command context and candidate transaction.
 * @param type - Requested textblock schema type.
 * @param attributes - Explicit overrides applied to each selected text block.
 * @returns Whether the entire structural range admits a nonempty conversion.
 */
export function setBlockSelectionType(context: CommandProps, type: NodeType, attributes: Record<string, unknown>): boolean {
  const selection = context.tr.selection;
  if (!(selection instanceof BlockSelection) || !context.editor.isEditable) return false;
  const parent = selection.$from.parent;
  // Structural selection never grants implicit access to a table's descendants.
  // Validate the complete direct range before the detached transform changes it.
  for (let index = selection.$from.index(); index < selection.$to.index(); index++) {
    const node = parent.child(index);
    if (!node.isTextblock || !parent.canReplaceWith(index, index + 1, type, node.marks)) return false;
  }
  const transform = new Transform(context.tr.doc);
  try {
    transform.setBlockType(selection.from, selection.to, type,
      node => filterNodeAttributes(type, { ...node.attrs, ...attributes }));
  } catch { return false; }
  if (!transform.docChanged) return false;
  if (context.dispatch) {
    for (const step of transform.steps) context.tr.step(step);
    context.tr.scrollIntoView();
  }
  return true;
}
