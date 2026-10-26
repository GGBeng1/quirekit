import { UndoRedo } from "@quirekit/starter-kit";
import { Extension } from "@quirekit/core";
import { getBuiltinClassicEditorText } from "../localization";
import type {
  ClassicEditorActionDefinition
} from "../types";
import {
  createClassicEditorRibbonAction,
  createClassicEditorToolbarAction
} from "./surfaces";

/** Direct Undo action shared by compact and ribbon projections. */
const undoAction: ClassicEditorActionDefinition = {
  id: "history.undo",
  label: getBuiltinClassicEditorText("undo"),
  icon: "undo",
  group: "history",
  order: 111,
  run: ({ editor }) => editor.commands.undo(),
  canExecute: ({ editor }) => editor.can().undo()
};
/** Direct Redo action shared by compact and ribbon projections. */
const redoAction: ClassicEditorActionDefinition = {
  id: "history.redo",
  label: getBuiltinClassicEditorText("redo"),
  icon: "redo",
  group: "history",
  order: 112,
  run: ({ editor }) => editor.commands.redo(),
  canExecute: ({ editor }) => editor.can().redo()
};

/** Provider-neutral history projections shared by default and injected backends. */
const historyControls = {
  /**
   * Creates the compact Undo and Redo controls.
   *
   * @returns History toolbar contributions.
   */
  addToolbarItems() {
    return [
      createClassicEditorToolbarAction(
        "toolbar.undo",
        undoAction
      ),
      createClassicEditorToolbarAction(
        "toolbar.redo",
        redoAction
      )
    ];
  },

  /**
   * Creates the Undo and Redo ribbon controls.
   *
   * @returns History ribbon contributions.
   */
  addRibbonItems() {
    return [
      createClassicEditorRibbonAction(
        "ribbon.undo",
        "home-history",
        undoAction
      ),
      createClassicEditorRibbonAction(
        "ribbon.redo",
        "home-history",
        redoAction
      )
    ];
  }
};

/** Standard history controls for an independently installed command provider. */
export const ClassicEditorHistoryControls = Extension.create({
  name: "classicEditorHistoryControls",
  ...historyControls
});

/** Default PM history with the same standard Classic controls. */
export const ClassicEditorUndoRedo = UndoRedo.extend(historyControls);
