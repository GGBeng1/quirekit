import type { CompileContext } from "../context";
import { createNodeId } from "../context";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireDomOverlayViewNode
} from "../../types";
import { resolveQuireViewNodePointerEvents } from "../target";

/**
 * Compiles a DOM overlay node.
 *
 * @param context - Recursive compile context.
 * @param node - DOM overlay widget node.
 * @returns Display output for the overlay portal.
 */
export function compileDomOverlayNode(
  context: CompileContext,
  node: QuireDomOverlayViewNode
): QuireCompiledViewNode {
  const rect = createResolvedRect(context.origin, context.constraints, node.width, node.height);
  const range = node.range ?? context.range;
  const pointerEvents = resolveQuireViewNodePointerEvents(node);

  return {
    rect,
    commands: [],
    domOverlays: [
      {
        id: createNodeId(context, node),
        ...(range === undefined ? {} : { range }),
        rect,
        html: node.html,
        ...(node.role === undefined ? {} : { role: node.role }),
        pointerEvents,
        ...(node.ariaLabel === undefined ? {} : { ariaLabel: node.ariaLabel })
      }
    ]
  };
}
