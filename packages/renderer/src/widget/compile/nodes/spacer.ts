import type { CompileContext } from "../context";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireSpacerViewNode
} from "../../types";

/**
 * Compiles a spacer node.
 *
 * @param context - Recursive compile context.
 * @param node - Spacer widget node.
 * @returns Display output for the spacer.
 */
export function compileSpacerNode(
  context: CompileContext,
  node: QuireSpacerViewNode
): QuireCompiledViewNode {
  return {
    rect: createResolvedRect(context.origin, context.constraints, node.width, node.height, 0, 0),
    commands: [],
    domOverlays: []
  };
}
