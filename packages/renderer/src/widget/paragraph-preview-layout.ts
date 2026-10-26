import type { CompileContext } from "./compile/context";
import {
  isFiniteQuireWidgetDimension,
  resolveQuireWidgetDimension
} from "./constraints";
import type { QuireParagraphPreviewViewNode } from "./types";

/**
 * Resolves the line layout width before wrapping text.
 *
 * @param context - Recursive compile context.
 * @param node - Paragraph preview widget node.
 * @param font - Resolved text font.
 * @returns Width used for wrapping and ellipsis.
 */
export function resolveParagraphLayoutWidth(
  context: CompileContext,
  node: QuireParagraphPreviewViewNode,
  font: string
): number {
  if (node.width !== undefined) {
    return node.width;
  }

  if (isFiniteQuireWidgetDimension(context.constraints.maxWidth)) {
    return resolveQuireWidgetDimension(
      undefined,
      context.constraints.maxWidth,
      context.constraints.minWidth,
      context.constraints.maxWidth
    );
  }

  return context.measureText(node.text, font).width;
}

/**
 * Creates visual text lines for the preview node.
 *
 * @param context - Recursive compile context.
 * @param node - Paragraph preview widget node.
 * @param font - Resolved text font.
 * @param layoutWidth - Width used for wrapping.
 * @returns Unbounded visual lines before max-line handling.
 */
export function createParagraphPreviewLines(
  context: CompileContext,
  node: QuireParagraphPreviewViewNode,
  font: string,
  layoutWidth: number
): readonly string[] {
  if (node.whiteSpace === "nowrap") {
    return [node.text];
  }

  return node.text
    .split(/\r?\n/u)
    .flatMap((paragraph) => wrapParagraphText(context, paragraph, font, layoutWidth));
}

/**
 * Wraps one hard-break paragraph into visual lines.
 *
 * @param context - Recursive compile context.
 * @param paragraph - Text without hard line breaks.
 * @param font - Resolved text font.
 * @param layoutWidth - Width used for wrapping.
 * @returns Wrapped visual lines.
 */
function wrapParagraphText(
  context: CompileContext,
  paragraph: string,
  font: string,
  layoutWidth: number
): readonly string[] {
  if (paragraph.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of paragraph.trim().split(/\s+/u)) {
    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;

    if (context.measureText(candidate, font).width <= layoutWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    const wordLines = wrapLongWord(context, word, font, layoutWidth);
    lines.push(...wordLines.slice(0, -1));
    currentLine = wordLines[wordLines.length - 1] ?? "";
  }

  if (currentLine.length > 0 || lines.length === 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Wraps one long word by grapheme-ish code points.
 *
 * @param context - Recursive compile context.
 * @param word - Word to wrap.
 * @param font - Resolved text font.
 * @param layoutWidth - Width used for wrapping.
 * @returns Wrapped word lines.
 */
function wrapLongWord(
  context: CompileContext,
  word: string,
  font: string,
  layoutWidth: number
): readonly string[] {
  const lines: string[] = [];
  let currentLine = "";

  for (const character of Array.from(word)) {
    const candidate = `${currentLine}${character}`;

    if (currentLine.length === 0 || context.measureText(candidate, font).width <= layoutWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = character;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
