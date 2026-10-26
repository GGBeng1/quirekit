import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorSelectionPopupWidgetContribution } from "../../types";
import { createClassicColorToolbar } from "./toolbar/color/factory";
import { BackgroundColor } from "@quirekit/extension-text-style";
import type { ClassicEditorRibbonWidgetContribution } from "../../types";



/**
 * Classic-aware BackgroundColor extension with actions and ribbon control.
 */
export const ClassicEditorBackgroundColor = BackgroundColor.extend({
  /** @returns Existing background-color controls for a settled text selection. */
  addSelectionPopupItems() {
    return [{ kind: "selection-popup-item", id: "selection.background-color", label: getBuiltinClassicEditorText("backgroundColor"), order: 126, placement: "secondary",
      toolbar: state => createClassicColorToolbar(state, "backgroundColor")
    }] satisfies readonly ClassicEditorSelectionPopupWidgetContribution[];
  },

  /**
   * Creates the character-background-color ribbon control.
   *
   * @returns One mounted background-color widget.
   */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget",
      id: "ribbon.background-color",
      groupId: "home-format",
      order: 126,
      toolbar: (state) => createClassicColorToolbar(state, "backgroundColor")
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  }
});
