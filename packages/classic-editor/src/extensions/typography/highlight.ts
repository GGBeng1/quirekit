import { Highlight } from "@quirekit/extension-text-style";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorRibbonWidgetContribution, ClassicEditorSelectionPopupWidgetContribution } from "../../types";
import { createClassicColorToolbar } from "./toolbar/color/factory";

/**
 * Classic-aware Highlight mark with Word's highlighter ribbon control.
 */
export const ClassicEditorHighlight = Highlight.extend({
  /** @returns Highlighter control for a settled text selection, before the text color as in Word. */
  addSelectionPopupItems() {
    return [{ kind: "selection-popup-item", id: "selection.text-highlight", label: getBuiltinClassicEditorText("textHighlight"), order: 124.5, placement: "secondary",
      toolbar: state => createClassicColorToolbar(state, "highlight")
    }] satisfies readonly ClassicEditorSelectionPopupWidgetContribution[];
  },

  /**
   * Creates the text highlighter ribbon control beside the text color.
   *
   * @returns One mounted highlighter widget.
   */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget",
      id: "ribbon.text-highlight",
      groupId: "home-format",
      order: 124.5,
      toolbar: (state) => createClassicColorToolbar(state, "highlight")
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  }
});
