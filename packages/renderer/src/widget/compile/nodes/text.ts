import type { QuireTextCommand } from "../../../core/display-list";
import type { CompileContext } from "../context";
import { createCommandId } from "../context";
import { createResolvedRect } from "../../sizing";
import type {
  QuireCompiledViewNode,
  QuireTextViewNode
} from "../../types";

const defaultTextFont = "16px sans-serif";
const defaultTextFillStyle = "#111827";
const defaultTextBaselineOffset = 16;

/**
 * Compiles a text node.
 *
 * @param context - Recursive compile context.
 * @param node - Text widget node.
 * @returns Display output for the text.
 */
export function compileTextNode(
  context: CompileContext,
  node: QuireTextViewNode
): QuireCompiledViewNode {
  const font = node.style?.font ?? defaultTextFont;
  const measured = context.measureText(node.text, font);
  const fallbackHeight = node.style?.lineHeight ?? measured.height;
  const rect = createResolvedRect(
    context.origin,
    context.constraints,
    node.width,
    node.height,
    measured.width,
    fallbackHeight
  );
  const commandRange = node.range ?? context.range;
  const command: QuireTextCommand = {
    id: createCommandId(context, node, "text"),
    kind: "text",
    ...(context.layer === undefined ? {} : { layer: context.layer }),
    ...(commandRange === undefined ? {} : { range: commandRange }),
    rect,
    text: node.text,
    origin: {
      x: rect.x,
      y: rect.y + (node.style?.baselineOffset ?? defaultTextBaselineOffset)
    },
    font,
    fillStyle: node.style?.color ?? defaultTextFillStyle
  };

  return {
    rect,
    commands: [command],
    domOverlays: []
  };
}
