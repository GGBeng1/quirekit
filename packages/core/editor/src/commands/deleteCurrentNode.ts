import type { CommandSpec } from "../types";

/**
 * Deletes the empty node currently containing the selection anchor.
 *
 * @param context - Current command execution context.
 * @returns Whether a matching empty node was deleted.
 */
export const deleteCurrentNode: CommandSpec = () => (context) => {
  const currentNode = context.tr.selection.$anchor.node();

  if (currentNode.content.size > 0) {
    return false;
  }

  const $pos = context.tr.selection.$anchor;

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);

    if (node.type === currentNode.type) {
      context.dispatch?.(
        context.tr.delete($pos.before(depth), $pos.after(depth)).scrollIntoView()
      );

      return true;
    }
  }

  return false;
};
