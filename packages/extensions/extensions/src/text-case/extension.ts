import { Extension } from "@quirekit/core";
import { createTextCaseCommands } from "./commands";
import type { TextCaseOptions, TextCaseStorage } from "./types";

/** Word-style "Change Case": rewrites characters while keeping their formatting. */
export const TextCase = Extension.create<TextCaseOptions, TextCaseStorage>({
  name: "textCase",

  /** @returns No host skip rule by default. */
  addOptions() {
    return { checkChangeable: null };
  },

  /** @returns Empty Shift+F3 cycle memory. */
  addStorage() {
    return { lastCycleDocument: null, lastCycleMode: null };
  },

  /** @returns Change-case commands. */
  addCommands() {
    return createTextCaseCommands(this.options, this.storage);
  },

  /** @returns Shift+F3 cycles lowercase, UPPERCASE and Capitalize Each Word. */
  addKeyboardShortcuts() {
    return { "Shift-F3": ({ commands }) => commands.cycleTextCase() };
  }
});
