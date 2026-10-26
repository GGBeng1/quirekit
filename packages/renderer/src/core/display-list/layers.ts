import type {
  QuireDisplayCommand,
  QuireDisplayList,
  QuireDisplayListLayers
} from "@quirekit/render-contract";

/**
 * Splits a composite display list into persistent content and transient overlay lists.
 *
 * @param displayList - Composite display list to split.
 * @returns Content and overlay display lists with the same bounds.
 */
export function splitQuireDisplayListLayers(
  displayList: QuireDisplayList
): QuireDisplayListLayers {
  const contentCommands: QuireDisplayCommand[] = [];
  const overlayCommands: QuireDisplayCommand[] = [];

  for (const command of displayList.commands) {
    if (command.layer === "overlay") {
      overlayCommands.push(command);
    } else {
      contentCommands.push(command);
    }
  }

  return {
    content: {
      bounds: displayList.bounds,
      commands: contentCommands
    },
    overlay: {
      bounds: displayList.bounds,
      commands: overlayCommands
    }
  };
}
