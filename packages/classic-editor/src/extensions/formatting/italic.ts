import { Italic } from "@quirekit/starter-kit";
import { readEffectiveDirectEmphasisState } from "@quirekit/extension-text-style";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorActionDefinition } from "../../types";
import {
  createClassicEditorRibbonAction,
  createClassicEditorSelectionPopupAction
} from "../surfaces";

export const italicAction: ClassicEditorActionDefinition = {
  id: "format.italic",
  label: getBuiltinClassicEditorText("italic"),
  icon: "italic",
  group: "formatting",
  order: 122,
  run: ({ editor }) => editor.commands.toggleItalic(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleItalic(),
  isActive: ({ editor }) => (
    readEffectiveDirectEmphasisState(editor.state, "italic") === true
  )
};

/** Classic-aware Italic Mark with its existing action and ribbon placement. */
export const ClassicEditorItalic = Italic.extend({
  /**
   * Creates the Italic ribbon item inside the shared formatting group.
   *
   * @returns Italic ribbon contribution.
   */
  addRibbonItems() {
    return [createClassicEditorRibbonAction(
      "ribbon.italic",
      "home-format",
      italicAction
    )];
  },

  /**
   * Creates the Italic item beside a non-empty text selection.
   *
   * @returns Italic selection-popup contribution.
   */
  addSelectionPopupItems() {
    return [createClassicEditorSelectionPopupAction(
      "selection.italic",
      italicAction
    )];
  }
});
