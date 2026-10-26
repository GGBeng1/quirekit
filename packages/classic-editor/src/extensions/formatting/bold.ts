import { Bold } from "@quirekit/starter-kit";
import { readEffectiveDirectEmphasisState } from "@quirekit/extension-text-style";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorActionDefinition } from "../../types";
import {
  createClassicEditorRibbonAction,
  createClassicEditorSelectionPopupAction
} from "../surfaces";

/** One direct action projected by all Bold product surfaces. */
export const boldAction: ClassicEditorActionDefinition = {
  id: "format.bold",
  label: getBuiltinClassicEditorText("bold"),
  icon: "bold",
  group: "formatting",
  order: 121,
  run: ({ editor }) => editor.commands.toggleBold(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleBold(),
  isActive: ({ editor }) => (
    readEffectiveDirectEmphasisState(editor.state, "bold") === true
  )
};

/** Classic-aware Bold Mark with its existing action and ribbon placement. */
export const ClassicEditorBold = Bold.extend({
  /**
   * Creates the Bold ribbon item inside the shared formatting group.
   *
   * @returns Bold ribbon contribution.
   */
  addRibbonItems() {
    return [createClassicEditorRibbonAction(
      "ribbon.bold",
      "home-format",
      boldAction
    )];
  },

  /**
   * Creates the Bold item beside a non-empty text selection.
   *
   * @returns Bold selection-popup contribution.
   */
  addSelectionPopupItems() {
    return [createClassicEditorSelectionPopupAction(
      "selection.bold",
      boldAction
    )];
  }
});
