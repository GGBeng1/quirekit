import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireSurfaceObjectSelectionConfig } from "../types";

const selectedDrawingCommandPrefix = "word-drawing-selection:";

/**
 * Applies host-owned semantic colors to selected-object display commands.
 *
 * Geometry, target identity, and Word behavior remain owned by the retained
 * drawing product. This last-mile projection changes paint only, so a theme
 * update does not invalidate layout geometry.
 *
 * @param commands - Retained or transient display commands to project.
 * @param config - Optional host object-selection color roles.
 * @returns Original commands without overrides, otherwise a projected command tree.
 */
export function applyQuireObjectSelectionSurfaceConfig(
  commands: readonly QuireDisplayCommand[],
  config: QuireSurfaceObjectSelectionConfig | undefined
): readonly QuireDisplayCommand[] {
  if (config === undefined) return commands;
  return commands.map(command => projectCommand(command, config));
}

/**
 * Projects one command and any nested clip commands.
 *
 * @param command - Command produced by the selected drawing product.
 * @param config - Complete caller override object.
 * @returns Paint-equivalent command with semantic object-selection colors.
 */
function projectCommand(
  command: QuireDisplayCommand,
  config: QuireSurfaceObjectSelectionConfig
): QuireDisplayCommand {
  if (command.kind === "clip") {
    const commands = applyQuireObjectSelectionSurfaceConfig(
      command.commands,
      config
    );
    return commands === command.commands ? command : { ...command, commands };
  }
  if (
    command.kind === "fill-rect"
    && command.id.includes(selectedDrawingCommandPrefix)
    && command.id.includes(":rotation-stem")
    && config.outlineStrokeStyle !== undefined
  ) {
    return { ...command, fillStyle: config.outlineStrokeStyle };
  }
  if (
    command.kind !== "path"
    || !command.id.includes(selectedDrawingCommandPrefix)
  ) return command;

  if (command.id.includes(":outline")) {
    return config.outlineStrokeStyle === undefined
      ? command
      : { ...command, strokeStyle: config.outlineStrokeStyle };
  }
  if (
    !command.id.includes(":resize-")
    && !command.id.includes(":rotation-handle")
    && !command.id.includes(":endpoint-")
  ) return command;
  return {
    ...command,
    ...(config.handleFillStyle === undefined || command.fillStyle === undefined
      ? {}
      : { fillStyle: config.handleFillStyle }),
    ...(config.handleStrokeStyle === undefined || command.strokeStyle === undefined
      ? {}
      : { strokeStyle: config.handleStrokeStyle })
  };
}
