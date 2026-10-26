import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorSelectionPopupWidgetContribution } from "../../types";
import { createClassicColorToolbar } from "./toolbar/color/factory";
import { Color } from "@quirekit/extension-text-style";
import type { ClassicEditorRibbonWidgetContribution } from "../../types";

/** Classic-aware foreground Color extension with actions and ribbon control. */
export const ClassicEditorColor = Color.extend({
  /** @returns Existing color controls for a settled text selection. */
  addSelectionPopupItems() {
    return [{ kind: "selection-popup-item", id: "selection.color", label: getBuiltinClassicEditorText("textColor"), order: 125, placement: "secondary",
      toolbar: state => createClassicColorToolbar(state, "color")
    }] satisfies readonly ClassicEditorSelectionPopupWidgetContribution[];
  },

  /**
   * Creates the direct foreground-color ribbon control.
   *
   * @returns One mounted foreground-color widget.
   */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget",
      id: "ribbon.text-color",
      groupId: "home-format",
      order: 125,
      toolbar: (state) => createClassicColorToolbar(state, "color")
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  }
});
