import type { QuireDisplayCommand } from "./display-list";
import type { QuireDrawSurface } from "@quirekit/render-contract";

/**
 * Paints one display-list command into a renderer-neutral draw surface.
 *
 * @param surface - Draw surface that receives the command.
 * @param command - Display command to paint.
 */
export function paintQuireDisplayCommand(
  surface: QuireDrawSurface,
  command: QuireDisplayCommand
): void {
  switch (command.kind) {
    case "fill-rect":
    case "caret":
      surface.fillRect(command);
      break;
    case "text":
      surface.fillText(command);
      break;
    case "glyph-run":
      surface.fillGlyphRun(command);
      break;
    case "line":
      surface.strokeLine(command);
      break;
    case "path":
      surface.drawPath(command);
      break;
    case "image":
      surface.drawImage(command);
      break;
    case "clip":
      surface.withClip(command, () => {
        for (const child of command.commands) {
          paintQuireDisplayCommand(surface, child);
        }
      });
      break;
  }
}
