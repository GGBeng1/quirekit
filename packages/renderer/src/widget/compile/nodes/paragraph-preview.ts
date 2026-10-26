import type {
  QuireClipCommand,
  QuireDisplayCommand,
  QuireTextCommand
} from "../../../core/display-list";
import type { CompileContext } from "../context";
import { createCommandId } from "../context";
import {
  createParagraphPreviewLines,
  resolveParagraphLayoutWidth
} from "../../paragraph-preview-layout";
import { applyParagraphPreviewLineLimit } from "../../paragraph-preview-overflow";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireParagraphPreviewViewNode
} from "../../types";

const defaultTextFont = "16px sans-serif";
const defaultTextFillStyle = "#111827";
const defaultTextBaselineOffset = 16;

/**
 * Compiles a static paragraph preview node.
 *
 * @param context - Recursive compile context.
 * @param node - Paragraph preview widget node.
 * @returns Display output for the paragraph preview.
 */
export function compileParagraphPreviewNode(
  context: CompileContext,
  node: QuireParagraphPreviewViewNode
): QuireCompiledViewNode {
  const font = node.style?.font ?? defaultTextFont;
  const measuredLine = context.measureText("M", font);
  const lineHeight = node.style?.lineHeight ?? measuredLine.height;
  const layoutWidth = resolveParagraphLayoutWidth(context, node, font);
  const lines = createParagraphPreviewLines(context, node, font, layoutWidth);
  const visibleLines = applyParagraphPreviewLineLimit(context, node, font, layoutWidth, lines);
  const fallbackHeight = Math.max(lineHeight, visibleLines.length * lineHeight);
  const rect = createResolvedRect(
    context.origin,
    context.constraints,
    node.width,
    node.height,
    layoutWidth,
    fallbackHeight
  );
  const textCommands = createParagraphPreviewTextCommands(
    context,
    node,
    rect.width,
    lineHeight,
    font,
    visibleLines
  );
  const commands =
    node.overflow === "clip" ? [createClipCommand(context, node, rect, textCommands)] : textCommands;

  return {
    rect,
    commands,
    domOverlays: []
  };
}

/**
 * Creates text commands for paragraph preview lines.
 *
 * @param context - Recursive compile context.
 * @param node - Paragraph preview widget node.
 * @param width - Text command width.
 * @param lineHeight - Resolved line height.
 * @param font - Resolved text font.
 * @param lines - Lines to emit.
 * @returns Display commands for the preview text lines.
 */
function createParagraphPreviewTextCommands(
  context: CompileContext,
  node: QuireParagraphPreviewViewNode,
  width: number,
  lineHeight: number,
  font: string,
  lines: readonly string[]
): readonly QuireTextCommand[] {
  const commandRange = node.range ?? context.range;

  return lines.map((line, index) => ({
    id: createCommandId(context, node, `line-${index}`),
    kind: "text",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(commandRange === undefined ? {} : { range: commandRange }),
    rect: {
      x: context.origin.x,
      y: context.origin.y + index * lineHeight,
      width,
      height: lineHeight
    },
    text: line,
    origin: {
      x: context.origin.x,
      y: context.origin.y + index * lineHeight + (node.style?.baselineOffset ?? defaultTextBaselineOffset)
    },
    font,
    fillStyle: node.style?.color ?? defaultTextFillStyle
  }));
}

/**
 * Creates a clip command around paragraph preview text commands.
 *
 * @param context - Recursive compile context.
 * @param node - Paragraph preview widget node.
 * @param rect - Clip rectangle.
 * @param commands - Text commands to clip.
 * @returns Clip display command.
 */
function createClipCommand(
  context: CompileContext,
  node: QuireParagraphPreviewViewNode,
  rect: QuireClipCommand["rect"],
  commands: readonly QuireDisplayCommand[]
): QuireClipCommand {
  const commandRange = node.range ?? context.range;

  return {
    id: createCommandId(context, node, "clip"),
    kind: "clip",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(commandRange === undefined ? {} : { range: commandRange }),
    rect,
    commands
  };
}
