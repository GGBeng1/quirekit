import { liftTarget } from "@quirekit/pm";
import type { CommandSpec } from "../types";

/**
 * Normalizes selected nodes back to their default textblock form.
 *
 * @param context - Current command execution context.
 * @returns Whether the normalization command was accepted.
 */
export const clearNodes: CommandSpec = () => (context) => {
  const { selection } = context.tr;

  selection.ranges.forEach(({ $from, $to }) => {
    context.state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
      if (node.type.isText) {
        return;
      }

      const { doc, mapping } = context.tr;
      const $mappedFrom = doc.resolve(mapping.map(pos));
      const $mappedTo = doc.resolve(mapping.map(pos + node.nodeSize));
      const nodeRange = $mappedFrom.blockRange($mappedTo);

      if (!nodeRange) {
        return;
      }

      const targetLiftDepth = liftTarget(nodeRange);

      if (node.type.isTextblock) {
        const { defaultType } = $mappedFrom.parent.contentMatchAt($mappedFrom.index());

        if (defaultType) {
          context.tr.setNodeMarkup(nodeRange.start, defaultType);
        }
      }

      if (targetLiftDepth !== null) {
        context.tr.lift(nodeRange, targetLiftDepth);
      }
    });
  });

  context.dispatch?.(context.tr.scrollIntoView());

  return true;
};
