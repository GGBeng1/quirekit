import {
  Formatting,
  readFormatPainterState
} from "@quirekit/extensions";
import { readHighlighterPenState } from "@quirekit/extension-text-style";
import { getBuiltinClassicEditorText } from "../localization";
import type { ClassicEditorActionDefinition } from "../types";
import { createClassicEditorRibbonAction, createClassicEditorSelectionPopupAction } from "./surfaces";

/** WPS-style format-painter action placed beside history controls. */
const formatPainterAction: ClassicEditorActionDefinition = {
  id: "format.format-painter",
  label: getBuiltinClassicEditorText("formatPainter"),
  icon: "formatPainter",
  group: "history",
  order: 113,
  // Only one brush tool owns selection gestures, so arming the painter stops the highlighter pen.
  run: ({ editor }) => {
    if (readHighlighterPenState(editor.state).active) editor.commands.stopHighlighterPen();
    return editor.commands.toggleFormatPainter();
  },
  canExecute: ({ editor }) => editor.isEditable && editor.can().toggleFormatPainter(),
  isActive: ({ editor }) => readFormatPainterState(editor.state).mode !== "off"
};

/** Unified clear-formatting action placed beside the format painter. */
const clearFormattingAction: ClassicEditorActionDefinition = {
  id: "format.clear-formatting",
  label: getBuiltinClassicEditorText("clearFormatting"),
  icon: "clearFormatting",
  group: "history",
  order: 114,
  run: ({ editor }) => editor.commands.clearFormatting(),
  canExecute: ({ editor }) => editor.isEditable && editor.can().clearFormatting()
};

/** Shared formatting behavior with Classic Home ribbon contributions. */
export const ClassicEditorFormattingTools = Formatting.extend({
  /** @returns The same formatting actions in the supporting selection row. */
  addSelectionPopupItems() {
    return [formatPainterAction, clearFormattingAction].map(action => ({
      ...createClassicEditorSelectionPopupAction(`selection.${action.id}`, action),
      placement: "secondary" as const
    }));
  },

  /**
   * Creates the two leading Home formatting controls.
   *
   * @returns Format-painter and clear-formatting ribbon actions.
   */
  addRibbonItems() {
    return [
      createClassicEditorRibbonAction(
        "ribbon.format-painter",
        "home-history",
        formatPainterAction
      ),
      createClassicEditorRibbonAction(
        "ribbon.clear-formatting",
        "home-history",
        clearFormattingAction
      )
    ];
  }
});
