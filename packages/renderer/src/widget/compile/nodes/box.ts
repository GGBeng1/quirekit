import type {
  QuireDisplayCommand,
  QuireFillRectCommand,
  QuirePathCommand
} from "../../../core/display-list";
import { createQuireRoundedRectPathSegments } from "../../../core/display-list";
import type { QuireDocumentRange } from "../../../core/document";
import type { QuireRect } from "../../../core/geometry";
import type { CompileContext } from "../context";
import { createCommandId } from "../context";
import { createResolvedRect } from "../../sizing";
import type {
  QuireBoxViewNode,
  QuireCompiledViewNode,
  QuireSurfaceViewNode,
  QuireWidgetBoxStyle,
  QuireWidgetStrokeStyle
} from "../../types";

interface QuireBoxPaintFields {
  readonly style?: QuireWidgetBoxStyle;
}

type QuireBoxLikeNode = (QuireBoxViewNode | QuireSurfaceViewNode) & QuireBoxPaintFields;

/**
 * Compiles a box node.
 *
 * @param context - Recursive compile context.
 * @param node - Box widget node.
 * @returns Display output for the box.
 */
export function compileBoxNode(
  context: CompileContext,
  node: QuireBoxViewNode
): QuireCompiledViewNode {
  const rect = createResolvedRect(context.origin, context.constraints, node.width, node.height);

  return {
    rect,
    commands: createBoxDisplayCommands(context, node, rect),
    domOverlays: []
  };
}

/**
 * Creates display commands for a rectangle-like node.
 *
 * @param context - Recursive compile context.
 * @param node - Node that owns box style fields.
 * @param rect - Rectangle used by the box paint commands.
 * @returns Display commands for the box style.
 */
export function createBoxDisplayCommands(
  context: CompileContext,
  node: QuireBoxLikeNode,
  rect: QuireRect
): QuireDisplayCommand[] {
  const commands: QuireDisplayCommand[] = [];
  const commandRange = node.range ?? context.range;
  const borderRadius = node.style?.borderRadius ?? 0;
  const hasRoundedCorners = Number.isFinite(borderRadius) && borderRadius > 0;

  if (node.style?.fill !== undefined) {
    commands.push(!hasRoundedCorners
      ? {
          id: createCommandId(context, node, "fill"),
          kind: "fill-rect",
          ...(context.layer === undefined ? {} : { layer: context.layer }),
          ...(commandRange === undefined ? {} : { range: commandRange }),
          rect,
          fillStyle: node.style.fill
        } satisfies QuireFillRectCommand
      : createRoundedRectPathCommand(
          context,
          node,
          rect,
          borderRadius,
          commandRange,
          "fill",
          { fillStyle: node.style.fill }
        ));
  }

  if (node.style?.stroke !== undefined && (node.style.stroke.width ?? 1) > 0) {
    commands.push(!hasRoundedCorners
      ? createStrokeRectCommand(context, node, rect, commandRange, node.style.stroke)
      : createRoundedRectPathCommand(
          context,
          node,
          rect,
          borderRadius,
          commandRange,
          "stroke",
          {
            strokeStyle: node.style.stroke.color,
            lineWidth: node.style.stroke.width ?? 1,
            ...(node.style.stroke.lineDash === undefined
              ? {}
              : { lineDash: node.style.stroke.lineDash })
          }
        ));
  }

  return commands;
}

/**
 * Creates one filled or stroked rounded-rectangle path command.
 *
 * @param context - Recursive compile context.
 * @param node - Box-like widget owning the style.
 * @param rect - Rectangle bounded by the rounded path.
 * @param radius - Requested corner radius normalized by the canonical helper.
 * @param range - Optional inherited document range.
 * @param suffix - Stable command id suffix.
 * @param paint - Fill or stroke fields for the path.
 * @returns Renderer-neutral rounded-rectangle path command.
 */
function createRoundedRectPathCommand(
  context: CompileContext,
  node: QuireBoxLikeNode,
  rect: QuireRect,
  radius: number,
  range: QuireDocumentRange | undefined,
  suffix: "fill" | "stroke",
  paint: Readonly<Pick<
    QuirePathCommand,
    "fillStyle" | "strokeStyle" | "lineWidth" | "lineDash"
  >>
): QuirePathCommand {
  return {
    id: createCommandId(context, node, suffix),
    kind: "path",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(range === undefined ? {} : { range }),
    rect,
    segments: createQuireRoundedRectPathSegments(rect, radius),
    ...(paint.fillStyle === undefined ? {} : { fillStyle: paint.fillStyle }),
    ...(paint.strokeStyle === undefined ? {} : { strokeStyle: paint.strokeStyle }),
    ...(paint.lineWidth === undefined ? {} : { lineWidth: paint.lineWidth }),
    ...(paint.lineDash === undefined ? {} : { lineDash: paint.lineDash })
  };
}

/**
 * Creates a stroke path command for a rectangle.
 *
 * @param context - Recursive compile context.
 * @param node - Box widget node.
 * @param rect - Rectangle to stroke.
 * @param range - Optional inherited document range.
 * @param stroke - Stroke style for the rectangle border.
 * @returns Path command that strokes the rectangle.
 */
function createStrokeRectCommand(
  context: CompileContext,
  node: QuireBoxLikeNode,
  rect: QuireRect,
  range: QuireDocumentRange | undefined,
  stroke: QuireWidgetStrokeStyle
): QuirePathCommand {
  return {
    id: createCommandId(context, node, "stroke"),
    kind: "path",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(range === undefined ? {} : { range }),
    rect,
    segments: [
      { kind: "move-to", point: { x: rect.x, y: rect.y } },
      { kind: "line-to", point: { x: rect.x + rect.width, y: rect.y } },
      { kind: "line-to", point: { x: rect.x + rect.width, y: rect.y + rect.height } },
      { kind: "line-to", point: { x: rect.x, y: rect.y + rect.height } },
      { kind: "close-path" }
    ],
    strokeStyle: stroke.color,
    lineWidth: stroke.width ?? 1,
    ...(stroke.lineDash === undefined ? {} : { lineDash: stroke.lineDash })
  };
}
