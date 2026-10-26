import type {
  QuireClipCommand,
  QuireDisplayCommand,
  QuireFillRectCommand,
  QuireLineCommand
} from "@quirekit/renderer";
import type {
  QuireTableBackgroundPaint,
  QuireTableBorderPaint,
  QuireTableContentClip,
  QuireTablePaintModel
} from "@quirekit/layout/table";

/**
 * Compiles a renderer-neutral table paint model into display-list commands.
 *
 * @param model - Table paint model produced by the table layout engine.
 * @returns Display commands ordered for table background, clipped content, and borders.
 */
export function compileQuireTablePaintCommands(
  model: QuireTablePaintModel
): readonly QuireDisplayCommand[] {
  const commands: QuireDisplayCommand[] = [];

  for (let index = 0; index < model.backgrounds.length; index += 1) {
    commands.push(compileTableBackgroundCommand(model.backgrounds[index]!));
  }

  for (let index = 0; index < model.contentClips.length; index += 1) {
    commands.push(compileTableContentClipCommand(model.contentClips[index]!));
  }

  for (let index = 0; index < model.borders.length; index += 1) {
    commands.push(compileTableBorderCommand(model.borders[index]!));
  }

  return commands;
}

/**
 * Compiles one table background descriptor into a filled rectangle command.
 *
 * @param background - Table or cell background paint descriptor.
 * @returns Filled rectangle display command for the background.
 */
function compileTableBackgroundCommand(
  background: QuireTableBackgroundPaint
): QuireFillRectCommand {
  return {
    id: background.id,
    kind: "fill-rect",
    range: background.range,
    rect: background.rect,
    fillStyle: background.fillStyle
  };
}

/**
 * Compiles one table content clip descriptor into an empty clipped command group.
 *
 * @param clip - Cell content clip paint descriptor.
 * @returns Clip display command reserved for recursive cell content commands.
 */
function compileTableContentClipCommand(
  clip: QuireTableContentClip
): QuireClipCommand {
  return {
    id: clip.id,
    kind: "clip",
    rect: clip.rect,
    commands: []
  };
}

/**
 * Compiles one table border descriptor into a line command.
 *
 * @param border - Table border paint descriptor.
 * @returns Line display command for the border segment.
 */
function compileTableBorderCommand(
  border: QuireTableBorderPaint
): QuireLineCommand {
  return {
    id: border.id,
    kind: "line",
    from: border.from,
    to: border.to,
    strokeStyle: border.strokeStyle,
    lineWidth: border.lineWidth,
    ...(border.lineCap === undefined ? {} : { lineCap: border.lineCap }),
    ...(border.lineDash === undefined ? {} : { lineDash: border.lineDash })
  };
}
