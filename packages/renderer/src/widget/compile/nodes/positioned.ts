import type { QuirePoint, QuireRect } from "../../../core/geometry";
import { createQuireWidgetConstraints, isFiniteQuireWidgetDimension } from "../../constraints";
import { createChildContext, type CompileContext, type CompileNodeCallback } from "../context";
import { translateCompiledViewNode } from "../../translate-command";
import type {
  QuireCompiledViewNode,
  QuirePositionedViewNode,
  QuireWidgetConstraints
} from "../../types";

/**
 * Compiles an absolute positioning wrapper.
 *
 * @param context - Recursive compile context.
 * @param node - Positioned widget node.
 * @param compileNode - Recursive compile callback.
 * @returns Display output for the positioned subtree.
 */
export function compilePositionedNode(
  context: CompileContext,
  node: QuirePositionedViewNode,
  compileNode: CompileNodeCallback
): QuireCompiledViewNode {
  const childConstraints = createPositionedChildConstraints(context.constraints, node);
  const measureOrigin = {
    x: context.origin.x + normalizePositionOffset(node.left),
    y: context.origin.y + normalizePositionOffset(node.top)
  };
  const compiled = compileNode(
    createChildContext(context, node.child, `${context.path}.0`, measureOrigin, childConstraints)
  );
  const resolvedOrigin = resolvePositionedOrigin(context, node, compiled.rect);

  return translateCompiledViewNode(
    compiled,
    resolvedOrigin.x - compiled.rect.x,
    resolvedOrigin.y - compiled.rect.y
  );
}

/**
 * Creates constraints for a positioned child.
 *
 * @param constraints - Parent constraints.
 * @param node - Positioned widget node.
 * @returns Constraints for the child measurement pass.
 */
function createPositionedChildConstraints(
  constraints: QuireWidgetConstraints,
  node: QuirePositionedViewNode
): QuireWidgetConstraints {
  const horizontalOffsets = resolvePositionedOffsetSpan(node.left, node.right);
  const verticalOffsets = resolvePositionedOffsetSpan(node.top, node.bottom);
  const maxWidth = subtractPositionedOffsetSpan(constraints.maxWidth, horizontalOffsets);
  const maxHeight = subtractPositionedOffsetSpan(constraints.maxHeight, verticalOffsets);
  const stretchedWidth = node.width ?? resolvePositionedStretchSize(maxWidth, node.left, node.right);
  const stretchedHeight = node.height ?? resolvePositionedStretchSize(maxHeight, node.top, node.bottom);

  return createQuireWidgetConstraints({
    minWidth: stretchedWidth ?? 0,
    maxWidth: stretchedWidth ?? maxWidth,
    minHeight: stretchedHeight ?? 0,
    maxHeight: stretchedHeight ?? maxHeight
  });
}

/**
 * Resolves the final origin for a positioned child.
 *
 * @param context - Recursive compile context.
 * @param node - Positioned widget node.
 * @param measuredRect - Child rectangle from the measurement pass.
 * @returns Final child origin.
 */
function resolvePositionedOrigin(
  context: CompileContext,
  node: QuirePositionedViewNode,
  measuredRect: QuireRect
): QuirePoint {
  return {
    x: resolvePositionedAxisOrigin(
      context.origin.x,
      context.constraints.maxWidth,
      node.left,
      node.right,
      measuredRect.width
    ),
    y: resolvePositionedAxisOrigin(
      context.origin.y,
      context.constraints.maxHeight,
      node.top,
      node.bottom,
      measuredRect.height
    )
  };
}

/**
 * Resolves one positioned-axis origin.
 *
 * @param origin - Parent axis origin.
 * @param parentSize - Parent axis max size.
 * @param start - Optional start offset.
 * @param end - Optional end offset.
 * @param childSize - Measured child size.
 * @returns Resolved axis origin.
 */
function resolvePositionedAxisOrigin(
  origin: number,
  parentSize: number,
  start: number | undefined,
  end: number | undefined,
  childSize: number
): number {
  if (start !== undefined) {
    return origin + normalizePositionOffset(start);
  }

  if (end !== undefined && isFiniteQuireWidgetDimension(parentSize)) {
    return origin + parentSize - normalizePositionOffset(end) - childSize;
  }

  return origin;
}

/**
 * Resolves whether opposite offsets should stretch a positioned child.
 *
 * @param available - Available axis size after offsets.
 * @param start - Optional start offset.
 * @param end - Optional end offset.
 * @returns Tight child size when both offsets are present.
 */
function resolvePositionedStretchSize(
  available: number,
  start: number | undefined,
  end: number | undefined
): number | undefined {
  if (start !== undefined && end !== undefined && isFiniteQuireWidgetDimension(available)) {
    return available;
  }

  return undefined;
}

/**
 * Resolves the total occupied offset span for one axis.
 *
 * @param start - Optional start offset.
 * @param end - Optional end offset.
 * @returns Sum of finite offsets on the axis.
 */
function resolvePositionedOffsetSpan(start: number | undefined, end: number | undefined): number {
  return normalizePositionOffset(start) + normalizePositionOffset(end);
}

/**
 * Subtracts positioned offsets from an available size.
 *
 * @param size - Available size before offsets.
 * @param offsets - Offset span to subtract.
 * @returns Remaining available size.
 */
function subtractPositionedOffsetSpan(size: number, offsets: number): number {
  if (!isFiniteQuireWidgetDimension(size)) {
    return size;
  }

  return Math.max(0, size - offsets);
}

/**
 * Normalizes a positioned offset while preserving deliberate negative offsets.
 *
 * @param offset - Offset value to normalize.
 * @returns Finite offset or zero.
 */
function normalizePositionOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset)) {
    return 0;
  }

  return offset;
}
