import type { CompileContext } from "./compile/context";
import type { QuireParagraphPreviewViewNode } from "./types";

const ellipsis = "…";

/**
 * Applies max-line and ellipsis behavior.
 *
 * @param context - Recursive compile context.
 * @param node - Paragraph preview widget node.
 * @param font - Resolved text font.
 * @param layoutWidth - Width used for wrapping.
 * @param lines - Unbounded visual lines.
 * @returns Lines that should be emitted.
 */
export function applyParagraphPreviewLineLimit(
  context: CompileContext,
  node: QuireParagraphPreviewViewNode,
  font: string,
  layoutWidth: number,
  lines: readonly string[]
): readonly string[] {
  const lineLimit = Math.max(0, Math.floor(node.maxLines ?? Number.POSITIVE_INFINITY));
  const visibleLines = Number.isFinite(lineLimit) ? lines.slice(0, lineLimit) : [...lines];
  const hasHiddenLines = visibleLines.length < lines.length;

  if (node.overflow !== "ellipsis" || visibleLines.length === 0) {
    return visibleLines;
  }

  const lastIndex = visibleLines.length - 1;
  const lastLine = visibleLines[lastIndex] ?? "";
  const shouldEllipsize =
    hasHiddenLines || context.measureText(lastLine, font).width > layoutWidth;

  if (!shouldEllipsize) {
    return visibleLines;
  }

  return [
    ...visibleLines.slice(0, lastIndex),
    ellipsizeLine(context, lastLine, font, layoutWidth)
  ];
}

/**
 * Truncates one line so it fits with a trailing ellipsis.
 *
 * @param context - Recursive compile context.
 * @param line - Line to truncate.
 * @param font - Resolved text font.
 * @param layoutWidth - Width used for ellipsis.
 * @returns Ellipsized line.
 */
function ellipsizeLine(
  context: CompileContext,
  line: string,
  font: string,
  layoutWidth: number
): string {
  if (context.measureText(ellipsis, font).width > layoutWidth) {
    return "";
  }

  let output = "";

  for (const character of Array.from(line)) {
    const candidate = `${output}${character}${ellipsis}`;

    if (context.measureText(candidate, font).width > layoutWidth) {
      break;
    }

    output += character;
  }

  return `${output}${ellipsis}`;
}
