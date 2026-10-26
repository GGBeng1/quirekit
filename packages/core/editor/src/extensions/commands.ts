import { Extension } from "../extension";
import * as commands from "../commands/core-commands";
import {
  extendMarkRange,
  resetAttributes,
  setMark,
  setMeta,
  toggleMark,
  unsetAllMarks,
  unsetMark,
  updateAttributes
} from "../commands/mark-commands";
import { updateDecorations } from "../commands/updateDecorations";

/** Tiptap-compatible core command extension. */
export const Commands = Extension.create({
  name: "commands",

  /**
   * Contributes core command helpers to every editor instance.
   *
   * @returns Core command map.
   */
  addCommands() {
    return {
      ...commands,
      extendMarkRange,
      resetAttributes,
      setMark,
      setMeta,
      toggleMark,
      unsetAllMarks,
      unsetMark,
      updateAttributes,
      updateDecorations
    };
  }
});
