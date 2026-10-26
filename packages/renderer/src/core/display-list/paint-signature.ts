import type { QuireDisplayCommand } from "@quirekit/render-contract";

/**
 * Creates a paint-only signature payload for one display command.
 *
 * Document ranges, ids, and layers are intentionally omitted because backend
 * painters do not read them. They remain present on display commands for hit
 * testing and diagnostics, but they must not force unchanged page pixels to
 * repaint after a range-only repeat edit.
 *
 * @param command - Display command to summarize.
 * @param objectSignature - Stable signature resolver for object-valued dependencies.
 * @param resolveChild - Caller-owned identity cache for nested clip children.
 * @returns JSON-serializable paint dependency payload.
 */
export function createQuireDisplayCommandPaintSignature(
  command: QuireDisplayCommand,
  objectSignature: (value: object | undefined) => string,
  resolveChild: (command: QuireDisplayCommand) => unknown
): unknown {
  switch (command.kind) {
    case "fill-rect":
    case "caret":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        rect: command.rect,
        fillStyle: command.fillStyle
      };
    case "text":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        rect: command.rect,
        text: command.text,
        origin: command.origin,
        font: command.font,
        fillStyle: command.fillStyle,
        letterSpacing: command.letterSpacing,
        horizontalScale: command.horizontalScale,
        trailingSpacing: command.trailingSpacing,
        paintMode: command.paintMode,
        strokeStyle: command.strokeStyle,
        lineWidth: command.lineWidth,
        direction: command.direction
      };
    case "glyph-run":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        rect: command.rect,
        text: command.text,
        origin: command.origin,
        font: command.font,
        fillStyle: command.fillStyle,
        glyphCoverage: command.glyphCoverage,
        glyphs: objectSignature(command.glyphs),
        letterSpacing: command.letterSpacing,
        horizontalScale: command.horizontalScale,
        trailingSpacing: command.trailingSpacing,
        paintMode: command.paintMode,
        strokeStyle: command.strokeStyle,
        lineWidth: command.lineWidth,
        direction: command.direction
      };
    case "line":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        from: command.from,
        to: command.to,
        strokeStyle: command.strokeStyle,
        lineWidth: command.lineWidth,
        lineDash: command.lineDash,
        lineCap: command.lineCap
      };
    case "path":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        rect: command.rect,
        segments: command.segments,
        fillStyle: command.fillStyle,
        strokeStyle: command.strokeStyle,
        lineWidth: command.lineWidth,
        lineDash: command.lineDash
      };
    case "image":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        rect: command.rect,
        source: objectSignature(command.source),
        href: command.href,
        sourceRect: command.sourceRect,
        sourceSize: command.sourceSize,
        colorAdjustment: command.colorAdjustment,
        transform: command.transform
      };
    case "clip":
      return {
        kind: command.kind,
        opacity: normalizePaintOpacity(command.opacity),
        rect: command.rect,
        transform: command.transform,
        visualBounds: command.visualBounds,
        commands: command.commands.map(resolveChild)
      };
  }
}

/**
 * Normalizes transient command opacity exactly as the Canvas and SVG surfaces do.
 *
 * Full opacity is omitted so an explicit `1` remains paint-equivalent to the
 * absent default while clamped values still invalidate cached page pixels.
 *
 * @param opacity - Optional renderer-neutral command opacity multiplier.
 * @returns Clamped opacity, or undefined when the command paints fully opaque.
 */
function normalizePaintOpacity(
  opacity: number | undefined
): number | undefined {
  if (opacity === undefined || opacity === 1) {
    return undefined;
  }

  return Math.min(1, Math.max(0, opacity));
}
