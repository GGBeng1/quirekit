import { createWavyTextDecorationCommand } from "./decoration-wave";
import { appendNativeUnderline } from "./underline";
import type {
  QuireDisplayCommand,
  QuireDocumentRange,
  QuireLineCommand
} from "@quirekit/renderer";
import type { QuireDecorationLine } from "../../decorations";
import {
  resolveQuireTextFragmentRunRect,
  type QuireTextFragment
} from "@quirekit/layout/text";
import { parseQuireFontPixelSize } from "@quirekit/layout/shaping";

/** Baseline-relative strike position used by the Word-compatible run model. */
const strikethroughFontSizeFactor = 0.27;

/**
 * Appends text-decoration commands for one segment.
 *
 * @param commands - Mutable display command list being built.
 * @param commandId - Base command id for the segment.
 * @param fragment - Parent text fragment.
 * @param range - Segment document range.
 * @param localX - Segment local x offset.
 * @param width - Segment width.
 * @param decorations - Text-decoration lines to paint.
 */
export function appendTextDecorationCommands(
  commands: QuireDisplayCommand[],
  commandId: string,
  fragment: QuireTextFragment,
  range: QuireDocumentRange,
  localX: number,
  width: number,
  decorations: readonly QuireDecorationLine[]
): void {
  for (let index = 0; index < decorations.length; index += 1) {
    const decoration = decorations[index]!;
    if (decoration.kind === "underline" && decoration.nativeUnderline === true && fragment.underline !== undefined) {
      appendNativeUnderline(commands, `${commandId}:text-decoration-${index}`, fragment, range, localX, width, decoration.color);
      continue;
    }
    const y = resolveTextDecorationY(fragment, decoration);
    const fromX = fragment.rect.x + localX;
    const toX = fromX + width;
    const id = `${commandId}:text-decoration-${index}`;
    if (decoration.style === "wavy") {
      commands.push(createWavyTextDecorationCommand(id, range, fromX, toX, y, decoration));
      continue;
    }
    // Single and double decorations share the same stroke authority; only their
    // baseline offsets and stable identities differ.
    const separation = Math.max(1, decoration.width);
    const strokes = decoration.style === "double"
      ? [["-upper", -separation], ["-lower", separation]] as const
      : [["", 0]] as const;
    for (const [suffix, offset] of strokes) {
      commands.push({
        id: `${id}${suffix}`, kind: "line", layer: decoration.paintSurface ?? "content", range,
        from: { x: fromX, y: y + offset }, to: { x: toX, y: y + offset },
        strokeStyle: decoration.color, lineWidth: decoration.width
      } satisfies QuireLineCommand);
    }
  }
}

/**
 * Resolves y coordinate for a text-decoration line.
 *
 * @param fragment - Text fragment being decorated.
 * @param decoration - Decoration line descriptor.
 * @returns Canvas y coordinate.
 */
function resolveTextDecorationY(
  fragment: QuireTextFragment,
  decoration: QuireDecorationLine
): number {
  const runRect = resolveQuireTextFragmentRunRect(fragment);

  switch (decoration.kind) {
    case "overline":
      return runRect.y + decoration.width;
    case "strikethrough": {
      const fontSize = parseQuireFontPixelSize(fragment.font);
      return fontSize === null
        ? runRect.y + runRect.height / 2
        : fragment.baseline - fontSize * strikethroughFontSizeFactor;
    }
    case "underline":
      return fragment.baseline + Math.max(2, decoration.width * 2);
  }
}
