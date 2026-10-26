import type {
  QuireDisplayCommand,
  QuireTextPaintCommand
} from "@quirekit/renderer";

/**
 * Collects geometry-owning text paint commands by id from a command tree.
 *
 * @param commands - Display commands to inspect.
 * @returns Text and glyph-run commands keyed by command id.
 */
export function collectSvgTextPaintCommands(
  commands: readonly QuireDisplayCommand[]
): Map<string, QuireTextPaintCommand> {
  const textCommands = new Map<string, QuireTextPaintCommand>();

  for (const command of commands) {
    if (command.kind === "text" || command.kind === "glyph-run") {
      // Native glyph boxes omit layout-owned spacing. Keep shared interaction geometry for
      // those advances; paint-only duplicates likewise cannot replace source geometry.
      if (command.geometryRole !== "decoration" && !command.trailingSpacing
        && (command.horizontalScale ?? 1) === 1) {
        textCommands.set(command.id, command);
      }
      continue;
    }

    if (command.kind === "clip") {
      for (const [id, child] of collectSvgTextPaintCommands(command.commands)) {
        textCommands.set(id, child);
      }
    }
  }

  return textCommands;
}
