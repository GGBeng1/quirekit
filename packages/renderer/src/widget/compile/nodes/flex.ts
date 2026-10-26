import {
  createQuireWidgetConstraints,
  emptyQuireWidgetInsets,
  insetQuireWidgetConstraints
} from "../../constraints";
import { createChildContext, type CompileContext, type CompileNodeCallback } from "../context";
import { combineCompiledChildren } from "../output";
import { createResolvedRect } from "../../sizing";
import { translateCompiledViewNode } from "../../translate-command";
import type {
  QuireCompiledViewNode,
  QuireFlexViewNode,
  QuireViewNode,
  QuireWidgetConstraints
} from "../../types";

/**
 * Compiles a row or column node.
 *
 * @param context - Recursive compile context.
 * @param node - Flex widget node.
 * @param compileNode - Recursive compile callback.
 * @returns Display output for the flex subtree.
 */
export function compileFlexNode(
  context: CompileContext,
  node: QuireFlexViewNode,
  compileNode: CompileNodeCallback
): QuireCompiledViewNode {
  const padding = node.padding ?? emptyQuireWidgetInsets;
  const innerConstraints = insetQuireWidgetConstraints(context.constraints, padding);
  const gap = Math.max(0, node.gap ?? 0);
  const measuredChildren = node.children.map((child, index) => ({
    child,
    flex: getSpacerFlex(child),
    path: `${context.path}.${index}`,
    measured: getSpacerFlex(child) > 0
      ? undefined
      : compileNode(
          createChildContext(
            context,
            child,
            `${context.path}.${index}`,
            { x: 0, y: 0 },
            innerConstraints
          )
        )
  }));
  const gapSize = Math.max(0, node.children.length - 1) * gap;
  const fixedMainSize = measuredChildren.reduce(
    (size, child) => size + (child.measured === undefined ? 0 : getMainSize(node, child.measured)),
    0
  );
  const totalFlex = measuredChildren.reduce((sum, child) => sum + child.flex, 0);
  const remainingMainSize = Math.max(
    0,
    getAvailableMainSize(node, innerConstraints) - fixedMainSize - gapSize
  );
  let cursorX = context.origin.x + padding.left;
  let cursorY = context.origin.y + padding.top;
  let mainSize = 0;
  let crossSize = 0;

  const compiledChildren: QuireCompiledViewNode[] = [];

  for (const child of measuredChildren) {
    const childOrigin = { x: cursorX, y: cursorY };
    const compiled =
      child.measured === undefined
        ? compileNode(
            createChildContext(
              context,
              child.child,
              child.path,
              childOrigin,
              createFlexSpacerConstraints(node, innerConstraints, remainingMainSize, child.flex, totalFlex)
            )
          )
        : translateCompiledViewNode(child.measured, childOrigin.x, childOrigin.y);

    compiledChildren.push(compiled);
    if (node.direction === "row") {
      cursorX += compiled.rect.width + gap;
      mainSize += compiled.rect.width + (compiledChildren.length > 1 ? gap : 0);
      crossSize = Math.max(crossSize, compiled.rect.height);
    } else {
      cursorY += compiled.rect.height + gap;
      mainSize += compiled.rect.height + (compiledChildren.length > 1 ? gap : 0);
      crossSize = Math.max(crossSize, compiled.rect.width);
    }
  }

  const widthFallback = node.direction === "row" ? mainSize : crossSize;
  const heightFallback = node.direction === "row" ? crossSize : mainSize;
  const rect = createResolvedRect(
    context.origin,
    context.constraints,
    node.width,
    node.height,
    widthFallback + padding.left + padding.right,
    heightFallback + padding.top + padding.bottom
  );

  return combineCompiledChildren(rect, compiledChildren);
}

/**
 * Reads the flex grow factor for spacer nodes.
 *
 * @param node - Child node to inspect.
 * @returns Non-negative flex grow factor.
 */
function getSpacerFlex(node: QuireViewNode): number {
  return node.kind === "spacer" ? Math.max(0, node.flex ?? 0) : 0;
}

/**
 * Reads the main-axis size of a compiled child.
 *
 * @param node - Flex container.
 * @param child - Compiled child.
 * @returns Child size along the flex main axis.
 */
function getMainSize(node: QuireFlexViewNode, child: QuireCompiledViewNode): number {
  return node.direction === "row" ? child.rect.width : child.rect.height;
}

/**
 * Reads the available main-axis size from constraints.
 *
 * @param node - Flex container.
 * @param constraints - Inner constraints after padding.
 * @returns Available main-axis size, or zero when unbounded.
 */
function getAvailableMainSize(
  node: QuireFlexViewNode,
  constraints: QuireWidgetConstraints
): number {
  const value = node.direction === "row" ? constraints.maxWidth : constraints.maxHeight;

  return Number.isFinite(value) ? value : 0;
}

/**
 * Creates tight constraints for a flexible spacer.
 *
 * @param node - Flex container.
 * @param constraints - Inner constraints after padding.
 * @param remainingMainSize - Main-axis size left after fixed children.
 * @param flex - Spacer flex factor.
 * @param totalFlex - Total flex factor in the container.
 * @returns Constraints for the spacer child.
 */
function createFlexSpacerConstraints(
  node: QuireFlexViewNode,
  constraints: QuireWidgetConstraints,
  remainingMainSize: number,
  flex: number,
  totalFlex: number
): QuireWidgetConstraints {
  const allocatedMainSize = totalFlex > 0 ? (remainingMainSize * flex) / totalFlex : 0;

  return createQuireWidgetConstraints({
    minWidth: node.direction === "row" ? allocatedMainSize : 0,
    maxWidth: node.direction === "row" ? allocatedMainSize : constraints.maxWidth,
    minHeight: node.direction === "row" ? 0 : allocatedMainSize,
    maxHeight: node.direction === "row" ? constraints.maxHeight : allocatedMainSize
  });
}
