import type { CompileContext } from "../context";
import { createNodeId } from "../context";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireCustomPaintViewNode
} from "../../types";

/**
 * Compiles a custom-paint node.
 *
 * @param context - Recursive compile context.
 * @param node - Custom-paint widget node.
 * @returns Display output for the custom command subtree.
 */
export function compileCustomPaintNode(
  context: CompileContext,
  node: QuireCustomPaintViewNode
): QuireCompiledViewNode {
  const rect = createResolvedRect(context.origin, context.constraints, node.width, node.height);

  return {
    rect,
    commands: node.paint(rect, createNodeId(context, node), context.runtime),
    domOverlays: []
  };
}
