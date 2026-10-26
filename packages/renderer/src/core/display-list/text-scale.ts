import type { QuireTextPaintCommand } from "@quirekit/render-contract";

/**
 * Converts final layout coordinates into the local space of a width-only paint transform.
 * Tracking is divided too, so applying the transform stretches glyph outlines but not gaps.
 *
 * @param command - Text command in final layout coordinates.
 *
 * @returns Paint-local command, retaining the original baseline origin.
 */
export function unscaleQuireTextCommand<Command extends QuireTextPaintCommand>(command: Command): Command {
  const scale = command.horizontalScale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError("Horizontal text scale must be positive and finite.");
  if (scale === 1) return command;
  return { ...command, horizontalScale: 1,
    rect: { ...command.rect, x: command.origin.x + (command.rect.x - command.origin.x) / scale,
      width: command.rect.width / scale },
    ...(command.letterSpacing === undefined ? {} : { letterSpacing: command.letterSpacing / scale }),
    ...(command.trailingSpacing === undefined ? {} : { trailingSpacing: command.trailingSpacing / scale }),
    ...(command.kind === "glyph-run" ? { glyphs: command.glyphs.map(glyph => ({ ...glyph,
      x: glyph.x / scale, xAdvance: glyph.xAdvance / scale, xOffset: glyph.xOffset / scale })) } : {})
  };
}

/**
 * Describes the width transform around the original baseline origin.
 * @param command - Final text geometry.
 * @returns Origin-preserving SVG affine, or undefined for identity.
 */
export function formatQuireTextScaleTransform(command: QuireTextPaintCommand): string | undefined {
  const scale = command.horizontalScale ?? 1;
  return scale === 1 ? undefined : `matrix(${scale} 0 0 1 ${(1 - scale) * command.origin.x} 0)`;
}
