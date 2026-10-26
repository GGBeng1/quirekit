import { Strike } from "@quirekit/starter-kit";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorActionDefinition } from "../../types";
import {
  createClassicEditorRibbonAction,
  createClassicEditorSelectionPopupAction
} from "../surfaces";

const strikeAction: ClassicEditorActionDefinition = {
  id: "format.strike",
  label: getBuiltinClassicEditorText("strike"),
  icon: "strike",
  group: "formatting",
  order: 124,
  run: ({ editor }) => editor.commands.toggleStrike(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleStrike(),
  isActive: ({ editor }) => editor.isActive("strike")
};

/** Classic-aware Strike Mark with one direct action and surface contributions. */
export const ClassicEditorStrike = Strike.extend({
  /**
   * Creates the Strike ribbon item.
   *
   * @returns Strike ribbon contribution.
   */
  addRibbonItems() {
    return [createClassicEditorRibbonAction(
      "ribbon.strike",
      "home-format",
      strikeAction
    )];
  },

  /**
   * Creates the Strike item beside a non-empty text selection.
   *
   * @returns Strike selection-popup contribution.
   */
  addSelectionPopupItems() {
    return [{ ...createClassicEditorSelectionPopupAction(
      "selection.strike", strikeAction
    ), placement: "primary" as const }];
  }
});
