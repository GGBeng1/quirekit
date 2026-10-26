import { Underline, isUnderlineActive } from "@quirekit/extension-underline";
import { createClassicUnderlineToolbar } from "./underline/toolbar";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorActionDefinition } from "../../types";
import {
  createClassicEditorSelectionPopupAction
} from "../surfaces";

export const underlineAction: ClassicEditorActionDefinition = {
  id: "format.underline",
  label: getBuiltinClassicEditorText("underline"),
  icon: "underline",
  group: "formatting",
  order: 123,
  run: ({ editor }) => editor.commands.toggleUnderline(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleUnderline(),
  isActive: ({ editor }) => isUnderlineActive(editor.state.pm)
};

/** Classic-aware Underline Mark with its existing action and ribbon placement. */
export const ClassicEditorUnderline = Underline.extend({
  /** @returns A split control retaining the existing underline contribution identity. */
  addRibbonWidgets() {
    return [{ kind: "ribbon-widget" as const, id: "ribbon.underline", groupId: "home-format", order: 123,
      toolbar: createClassicUnderlineToolbar }];
  },

  /**
   * Creates the Underline item beside a non-empty text selection.
   *
   * @returns Underline selection-popup contribution.
   */
  addSelectionPopupItems() {
    return [createClassicEditorSelectionPopupAction(
      "selection.underline",
      underlineAction
    )];
  }
});
