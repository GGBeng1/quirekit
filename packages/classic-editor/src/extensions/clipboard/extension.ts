import { Extension } from "@quirekit/core";
import { classicEditorClipboardContextMenuItems } from "./actions";
import { mountClassicEditorPlainTextPaste } from "./shortcut";
import { classicEditorClipboardSelectionItems } from "./selection";
import type { ClassicEditorClipboardOptions } from "./types";

/** Product clipboard rows for the text context menu and the text-only paste shortcut. */
export const ClassicEditorClipboard = Extension.create<ClassicEditorClipboardOptions>({
  name: "classicEditorClipboard",

  /** @returns Context-menu rows and the shortcut enabled by default. */
  addOptions() {
    return { contextMenu: true, selectionPopup: true, plainTextPasteShortcut: true };
  },

  /** @returns Cut, copy, paste and text-only paste rows. */
  addContextMenuItems() {
    return this.options.contextMenu ? classicEditorClipboardContextMenuItems : [];
  },

  /** @returns Compact clipboard entries using the same system clipboard actions. */
  addSelectionPopupItems() {
    return this.options.selectionPopup ? classicEditorClipboardSelectionItems : [];
  },

  /** @returns Renderless Ctrl/⌘+Shift+V handler. */
  addWorkspaceWidgets() {
    return this.options.plainTextPasteShortcut
      ? [{ kind: "workspace-widget" as const, id: "workspace.clipboard-plain-text-paste", mount: mountClassicEditorPlainTextPaste }]
      : [];
  }
});
