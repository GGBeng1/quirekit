import { DECORATION_MANAGER_PLUGIN_KEY } from "../decorations";
import type { Command } from "../types";

/** Forces all or one extension's declarative decorations to recompute. */
export function updateDecorations(extensionName?: string): Command {
  return ({ tr, dispatch }) => {
    if (dispatch) {
      tr.setMeta(DECORATION_MANAGER_PLUGIN_KEY, {
        type: "force",
        name: extensionName
      });
    }

    return true;
  };
}
