import type { QuireLineCommand } from "../../../core/display-list";
import type { CompileContext } from "../context";
import { createCommandId } from "../context";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireDividerViewNode
} from "../../types";

const defaultDividerColor = "#cbd5e1";
const defaultDividerWidth = 1;

/**
 * Compiles a divider node.
 *
 * @param context - Recursive compile context.
 * @param node - Divider widget node.
 * @returns Display output for the divider.
 */
export function compileDividerNode(
  context: CompileContext,
  node: QuireDividerViewNode
): QuireCompiledViewNode {
  const lineWidth = Math.max(0, node.style?.width ?? defaultDividerWidth);
  const rect = createResolvedRect(
    context.origin,
    context.constraints,
    node.width,
    node.height,
    node.axis === "vertical" ? lineWidth : finiteOrZero(context.constraints.maxWidth),
    node.axis === "vertical" ? finiteOrZero(context.constraints.maxHeight) : lineWidth
  );
  const commandRange = node.range ?? context.range;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const command: QuireLineCommand = {
    id: createCommandId(context, node, "line"),
    kind: "line",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(commandRange === undefined ? {} : { range: commandRange }),
    from:
      node.axis === "vertical"
        ? { x: centerX, y: rect.y }
        : { x: rect.x, y: centerY },
    to:
      node.axis === "vertical"
        ? { x: centerX, y: rect.y + rect.height }
        : { x: rect.x + rect.width, y: centerY },
    strokeStyle: node.style?.color ?? defaultDividerColor,
    lineWidth
  };

  return {
    rect,
    commands: lineWidth > 0 ? [command] : [],
    domOverlays: []
  };
}

/**
 * Converts infinity to zero for divider fallback sizing.
 *
 * @param value - Dimension to inspect.
 * @returns Finite dimension or zero.
 */
function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
