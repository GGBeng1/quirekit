import { createClassicCompactToolbar } from "../toolbar/compact";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorSelectionPopupWidgetContribution } from "../../types";
import { FontSize } from "@quirekit/extension-text-style";
import type { ClassicEditorRibbonWidgetContribution } from "../../types";

import { createClassicFontSizeToolbar } from "./toolbar/font-size/factory";

/** Classic-aware FontSize extension with actions and a compound ribbon control. */
export const ClassicEditorFontSize = FontSize.extend({
  /** @returns Existing font-size controls for a settled text selection. */
  addSelectionPopupItems() {
    return [{ kind: "selection-popup-item", id: "selection.font-size", label: getBuiltinClassicEditorText("fontSize"), order: 115,
      toolbar: state => createClassicCompactToolbar(state, createClassicFontSizeToolbar, ["size"])
    }] satisfies readonly ClassicEditorSelectionPopupWidgetContribution[];
  },

  /**
   * Creates the font-size input and grow/shrink controls.
   *
   * @returns One mounted font-size ribbon widget.
   */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget",
      id: "ribbon.font-size",
      groupId: "home-format",
      order: 120.5,
      toolbar: createClassicFontSizeToolbar
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  }
});
