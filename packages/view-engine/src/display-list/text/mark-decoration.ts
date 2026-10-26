import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDecorationLine } from "../../decorations";
const emptyDecorationLines: readonly QuireDecorationLine[] = [];

/**
 * Converts a fragment's mark text-decoration kinds into colored decoration lines.
 *
 * A mark underline/strike uses the text's own color and a baseline width, so it
 * tracks the glyph color (unlike a decoration span, which carries its own color).
 *
 * @param fragment - Text fragment whose mark decorations should be resolved.
 * @param color - Glyph color used to paint the decoration lines.
 * @returns Decoration lines for the fragment's marks.
 */
export function resolveMarkDecorationLines(
  fragment: QuireTextFragment,
  color: string
): readonly QuireDecorationLine[] {
  const textDecoration = fragment.textDecoration;
  if (textDecoration === undefined || textDecoration.length === 0) {
    return emptyDecorationLines;
  }

  return textDecoration.map(line => ({
    kind: line === "line-through" || line === "double-line-through" ? "strikethrough" : line,
    color,
    ...(line === "underline" && fragment.underline ? { nativeUnderline: true } : {}),
    width: 1,
    ...(line === "double-line-through" ? { style: "double" as const } : {})
  }));
}
