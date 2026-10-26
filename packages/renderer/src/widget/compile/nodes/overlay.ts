import {
  clampQuireWidgetDimension,
  createQuireWidgetConstraints
} from "../../constraints";
import { createChildContext, type CompileContext, type CompileNodeCallback } from "../context";
import { combineCompiledChildren } from "../output";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireOverlayViewNode
} from "../../types";
import type { QuirePoint } from "../../../core/geometry";

/**
 * Compiles an overlay node.
 *
 * @param context - Recursive compile context.
 * @param node - Overlay widget node.
 * @param compileNode - Recursive compile callback.
 * @returns Display output for the overlay subtree.
 */
export function compileOverlayNode(
  context: CompileContext,
  node: QuireOverlayViewNode,
  compileNode: CompileNodeCallback
): QuireCompiledViewNode {
  const overlayConstraints = createQuireWidgetConstraints({
    minWidth: context.constraints.minWidth,
    maxWidth: resolveOverlayMaxDimension(context.constraints.maxWidth, node.width),
    minHeight: context.constraints.minHeight,
    maxHeight: resolveOverlayMaxDimension(context.constraints.maxHeight, node.height)
  });
  const compiledChildren = node.children.map((child, index) =>
    compileNode(
      createChildContext(
        context,
        child,
        `${context.path}.${index}`,
        context.origin,
        overlayConstraints
      )
    )
  );
  const fallback = resolveOverlayFallbackSize(context.origin, compiledChildren);
  const rect = createResolvedRect(
    context.origin,
    context.constraints,
    node.width,
    node.height,
    fallback.width,
    fallback.height
  );

  return combineCompiledChildren(rect, compiledChildren);
}

/**
 * Resolves max constraints for an overlay child.
 *
 * @param currentMax - Current max dimension.
 * @param fixed - Optional fixed parent dimension.
 * @returns Max dimension used by overlay children.
 */
function resolveOverlayMaxDimension(currentMax: number, fixed: number | undefined): number {
  if (fixed !== undefined) {
    return clampQuireWidgetDimension(fixed, 0, currentMax);
  }

  return currentMax;
}

/**
 * Resolves fallback size from overlay children.
 *
 * @param origin - Overlay origin.
 * @param children - Compiled overlay children.
 * @returns Maximum child size.
 */
function resolveOverlayFallbackSize(
  origin: QuirePoint,
  children: readonly QuireCompiledViewNode[]
): {
  readonly width: number;
  readonly height: number;
} {
  return {
    width: Math.max(0, ...children.map((child) => child.rect.x - origin.x + child.rect.width)),
    height: Math.max(0, ...children.map((child) => child.rect.y - origin.y + child.rect.height))
  };
}
