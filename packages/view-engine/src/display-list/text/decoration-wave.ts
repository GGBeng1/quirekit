import type { QuireDocumentRange, QuirePathCommand, QuirePathSegment } from "@quirekit/renderer";
import type { QuireDecorationLine } from "../../decorations";

/**
 * Creates a wavy text-decoration path command.
 *
 * @param commandId - Complete stable paint identity.
 * @param range - Document range represented by the path.
 * @param fromX - Path start x.
 * @param toX - Path end x.
 * @param y - Baseline y for the wave.
 * @param decoration - Decoration line descriptor.
 * @param amplitude - Wave amplitude in CSS pixels.
 * @param step - Half-period in CSS pixels.
 * @param padding - Extra stroke hull padding for native underline bounds.
 * @returns Path command for a wavy text-decoration.
 */
export function createWavyTextDecorationCommand(
  commandId: string,
  range: QuireDocumentRange,
  fromX: number,
  toX: number,
  y: number,
  decoration: QuireDecorationLine,
  amplitude = Math.max(1.5, decoration.width * 1.5),
  step = 4,
  padding = 0
): QuirePathCommand {
  const segments: QuirePathSegment[] = [
    { kind: "move-to", point: { x: fromX, y } }
  ];

  for (let x = fromX; x < toX; x += step) {
    const nextX = Math.min(x + step, toX);
    const controlX = x + (nextX - x) / 2;
    const controlY = y + (segments.length % 2 === 0 ? -amplitude : amplitude);

    segments.push({
      kind: "quadratic-curve-to",
      control: { x: controlX, y: controlY },
      point: { x: nextX, y }
    });
  }

  return {
    id: commandId,
    kind: "path",
    layer: decoration.paintSurface ?? "content",
    range,
    rect: {
      x: fromX,
      y: y - amplitude - padding,
      width: Math.max(1, toX - fromX),
      height: amplitude * 2 + padding * 2
    },
    segments,
    strokeStyle: decoration.color,
    lineWidth: decoration.width
  };
}
