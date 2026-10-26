import type { QuireTextPaintCommand } from "../core/display-list";
import { unscaleQuireTextCommand } from "../core/display-list/text-scale";
import type { Canvas2DRenderTarget } from "./types";

/**
 * Scopes width-only paint around a command baseline without changing page geometry.
 *
 * @param target - Canvas target.
 * @param command - Final geometry.
 * @param draw - Paint operation in local coordinates.
 */
export function withCanvasTextScale<Command extends QuireTextPaintCommand>(target: Canvas2DRenderTarget, command: Command, draw: (local: Command) => void): void {
  const scale = command.horizontalScale ?? 1;
  if (scale === 1) { draw(command); return; }
  const local = unscaleQuireTextCommand(command);
  if (!target.save || !target.restore || !target.transform) throw new RangeError("Canvas text scaling requires save, restore and transform.");
  target.save();
  try {
    target.transform(scale, 0, 0, 1, (1 - scale) * command.origin.x, 0);
    draw(local);
  } finally { target.restore(); }
}
