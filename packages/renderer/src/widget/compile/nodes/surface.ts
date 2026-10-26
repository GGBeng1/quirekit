import {
  createQuireWidgetConstraints,
  emptyQuireWidgetInsets,
  insetQuireWidgetConstraints
} from "../../constraints";
import { createChildContext, type CompileContext, type CompileNodeCallback } from "../context";
import { createBoxDisplayCommands } from "./box";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireSurfaceViewNode,
  QuireWidgetConstraints
} from "../../types";

/**
 * Compiles a semantic surface node.
 *
 * @param context - Recursive compile context.
 * @param node - Surface widget node.
 * @param compileNode - Recursive compile callback.
 * @returns Display output for the surface subtree.
 */
export function compileSurfaceNode(
  context: CompileContext,
  node: QuireSurfaceViewNode,
  compileNode: CompileNodeCallback
): QuireCompiledViewNode {
  const padding = node.padding ?? emptyQuireWidgetInsets;
  const childOrigin = {
    x: context.origin.x + padding.left,
    y: context.origin.y + padding.top
  };
  const childConstraints = createSurfaceChildConstraints(context, node);
  const compiledChild =
    node.child === undefined
      ? undefined
      : compileNode(
          createChildContext(
            context,
            node.child,
            `${context.path}.0`,
            childOrigin,
            childConstraints
          )
        );
  const fallbackWidth =
    (compiledChild?.rect.width ?? 0) + padding.left + padding.right;
  const fallbackHeight =
    (compiledChild?.rect.height ?? 0) + padding.top + padding.bottom;
  const rect = createResolvedRect(
    context.origin,
    context.constraints,
    node.width,
    node.height,
    fallbackWidth,
    fallbackHeight
  );

  return {
    rect,
    commands: [
      ...createBoxDisplayCommands(context, node, rect),
      ...(compiledChild?.commands ?? [])
    ],
    domOverlays: compiledChild?.domOverlays ?? [],
    targets: compiledChild?.targets ?? []
  };
}

/**
 * Resolves child constraints for a surface.
 *
 * Fixed surface dimensions should also bound child layout, otherwise flex
 * spacers cannot know how much room remains inside the surface chrome.
 *
 * @param context - Recursive compile context.
 * @param node - Surface widget node.
 * @returns Constraints for the optional surface child.
 */
function createSurfaceChildConstraints(
  context: CompileContext,
  node: QuireSurfaceViewNode
): QuireWidgetConstraints {
  const padding = node.padding ?? emptyQuireWidgetInsets;

  if (node.width !== undefined || node.height !== undefined) {
    return createQuireWidgetConstraints({
      minWidth: 0,
      maxWidth:
        node.width === undefined
          ? context.constraints.maxWidth
          : Math.max(0, node.width - padding.left - padding.right),
      minHeight: 0,
      maxHeight:
        node.height === undefined
          ? context.constraints.maxHeight
          : Math.max(0, node.height - padding.top - padding.bottom)
    });
  }

  return insetQuireWidgetConstraints(context.constraints, padding);
}
