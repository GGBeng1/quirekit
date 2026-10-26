import { Extension, type CommandProps } from "@quirekit/core";
import { handleBackspace, handleDelete } from "./helpers";
import type { ListKeymapOptions, ListKeymapTypeConfig } from "../types";

/** List keymap extension for Backspace and Delete list-item behavior. */
export const ListKeymap = Extension.create<ListKeymapOptions>({
  name: "listKeymap",

  addOptions() {
    return {
      listTypes: [
        {
          itemName: "listItem",
          wrapperNames: ["bulletList", "orderedList"]
        },
        {
          itemName: "taskItem",
          wrapperNames: ["taskList"]
        }
      ]
    };
  },

  addKeyboardShortcuts() {
    return {
      Delete: (context: CommandProps) =>
        runListDeleteHandlers(context, this.options.listTypes),
      "Mod-Delete": (context: CommandProps) =>
        runListDeleteHandlers(context, this.options.listTypes),
      Backspace: (context: CommandProps) =>
        runListBackspaceHandlers(context, this.options.listTypes),
      "Mod-Backspace": (context: CommandProps) =>
        runListBackspaceHandlers(context, this.options.listTypes)
    };
  }
});

/**
 * Runs Delete behavior against configured list families.
 *
 * @param context - Current command context.
 * @param listTypes - Configured list type families.
 * @returns Whether a list delete handler changed the document.
 */
function runListDeleteHandlers(
  context: CommandProps,
  listTypes: readonly ListKeymapTypeConfig[]
): boolean {
  return listTypes.some(({ itemName }) => {
    if (!context.state.schema.nodes[itemName]) {
      return false;
    }

    return handleDelete(context.editor, itemName);
  });
}

/**
 * Runs Backspace behavior against configured list families.
 *
 * @param context - Current command context.
 * @param listTypes - Configured list type families.
 * @returns Whether a list backspace handler changed the document.
 */
function runListBackspaceHandlers(
  context: CommandProps,
  listTypes: readonly ListKeymapTypeConfig[]
): boolean {
  return listTypes.some(({ itemName, wrapperNames }) => {
    if (!context.state.schema.nodes[itemName]) {
      return false;
    }

    return handleBackspace(context.editor, itemName, wrapperNames, context);
  });
}
