import type { QuireClipCommand } from "../../core/display-list";
import { insetQuireWidgetConstraints } from "../constraints";
import {
  createChildContext,
  createCommandId,
  type CompileContext,
  type CompileNodeCallback
} from "./context";
import { createResolvedRect } from "../sizing";
import type {
  QuireClipViewNode,
  QuireCompiledViewNode,
  QuirePaddingViewNode
} from "../types";

/**
 * Compiles a padding node.
 *
 * @param context - Recursive compile context.
 * @param node - Padding widget node.
 * @param compileNode - Recursive compile callback.
 * @returns Display output for the padded subtree.
 */
export function compilePaddingNode(
  context: CompileContext,
  node: QuirePaddingViewNode,
  compileNode: CompileNodeCallback
): QuireCompiledViewNode {
  const childOrigin = {
    x: context.origin.x + node.insets.left,
    y: context.origin.y + node.insets.top
  };
  const compiled = compileNode(
    createChildContext(
      context,
      node.child,
      `${context.path}.0`,
      childOrigin,
      insetQuireWidgetConstraints(context.constraints, node.insets)
    )
  );

  return {
    rect: {
      x: context.origin.x,
      y: context.origin.y,
      width: compiled.rect.width + node.insets.left + node.insets.right,
      height: compiled.rect.height + node.insets.top + node.insets.bottom
    },
    commands: compiled.commands,
    domOverlays: compiled.domOverlays,
    targets: compiled.targets ?? []
  };
}

/**
 * Compiles a clip node.
 *
 * @param context - Recursive compile context.
 * @param node - Clip widget node.
 * @param compileNode - Recursive compile callback.
 * @returns Display output for the clipped subtree.
 */
export function compileClipNode(
  context: CompileContext,
  node: QuireClipViewNode,
  compileNode: CompileNodeCallback
): QuireCompiledViewNode {
  const clipRect = createResolvedRect(context.origin, context.constraints, node.width, node.height);
  const compiled = compileNode(
    createChildContext(context, node.child, `${context.path}.0`, context.origin, {
      minWidth: 0,
      maxWidth: clipRect.width,
      minHeight: 0,
      maxHeight: clipRect.height
    })
  );
  const commandRange = node.range ?? context.range;
  const command: QuireClipCommand = {
    id: createCommandId(context, node, "clip"),
    kind: "clip",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(commandRange === undefined ? {} : { range: commandRange }),
    rect: clipRect,
    commands: compiled.commands
  };

  return {
    rect: clipRect,
    commands: [command],
    domOverlays: compiled.domOverlays,
    targets: compiled.targets ?? []
  };
}
