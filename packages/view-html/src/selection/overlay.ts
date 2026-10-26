import type {
  QuireDisplayCommand,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import { isMountedSelectionOverlayCommand } from "@quirekit/view/mounted-backend";

/**
 * Removes model selection commands from the HTML auxiliary SVG overlay.
 *
 * HTML selection and caret presentation comes from measured retained DOM
 * geometry. Search, review, collaboration, and provider overlay commands remain
 * in the SVG product, so backend-neutral overlay layering is preserved without
 * painting two selection authorities.
 *
 * @param displayList - Renderer-neutral auxiliary overlay display list.
 * @param bounds - Current HTML overlay surface bounds.
 * @returns Display list containing only non-selection auxiliary commands.
 */
export function createHtmlAuxiliaryOverlayDisplayList(
  displayList: QuireDisplayList,
  bounds: QuireRect
): QuireDisplayList {
  return {
    ...displayList,
    bounds,
    commands: filterHtmlSelectionCommands(displayList.commands)
  };
}

/**
 * Filters selection commands recursively through clip groups.
 *
 * @param commands - Display commands to inspect.
 * @returns Commands outside the canonical model selection layer.
 */
function filterHtmlSelectionCommands(
  commands: readonly QuireDisplayCommand[]
): readonly QuireDisplayCommand[] {
  return commands
    .filter((command) => !isMountedSelectionOverlayCommand(command))
    .map((command) =>
      command.kind === "clip"
        ? { ...command, commands: filterHtmlSelectionCommands(command.commands) }
        : command
    );
}
