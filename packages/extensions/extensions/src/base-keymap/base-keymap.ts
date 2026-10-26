import { Extension } from "@quirekit/core";
import { baseKeymap, keymap } from "@quirekit/pm";

/** Extension that installs ProseMirror's base keymap. */
export const BaseKeymap = Extension.create({
  name: "baseKeymap",
  priority: 850,
  /**
   * Creates the ProseMirror plugin list for the base keymap.
   *
   * @returns ProseMirror plugin list containing the base keymap handler.
   */
  addProseMirrorPlugins() {
    return [keymap(baseKeymap)];
  }
});
