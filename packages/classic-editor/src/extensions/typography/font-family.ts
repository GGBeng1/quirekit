import { createClassicCompactToolbar } from "../toolbar/compact";
import type { ClassicEditorSelectionPopupWidgetContribution } from "../../types";
import { createClassicFontFamilyToolbar } from "./toolbar/font-family/factory";
import { FontFamily } from "@quirekit/extension-text-style";
import type { ClassicEditorRibbonWidgetContribution } from "../../types";
import type { ClassicEditorGlobalSettingsSectionContribution } from "../../types";
import { getBuiltinClassicEditorText } from "../../localization";
import { markRaw } from "vue";
import {
  DocumentFontSettings,
  globalFontSettingsSectionId
} from "./global-settings";

const fontLibraryWidgetId = "ribbon.font-family";


/** Classic-aware FontFamily Extension with its compound ribbon placement. */
export const ClassicEditorFontFamily = FontFamily.extend({
  /** @returns Existing font-family controls for a settled text selection. */
  addSelectionPopupItems() {
    return [{ kind: "selection-popup-item", id: "selection.font-family", label: getBuiltinClassicEditorText("fontFamily"), order: 110,
      toolbar: state => createClassicCompactToolbar(state, createClassicFontFamilyToolbar, ["family"])
    }] satisfies readonly ClassicEditorSelectionPopupWidgetContribution[];
  },

  /**
   * Contributes document script-font defaults to the extensible global panel.
   *
   * @returns One product-level font settings section.
   */
  addGlobalSettingsSections() {
    return [{
      kind: "global-settings-section",
      id: globalFontSettingsSectionId,
      label: getBuiltinClassicEditorText("fontFamily"),
      description: getBuiltinClassicEditorText("globalFontSettingsDescription"),
      order: 10,
      component: markRaw(DocumentFontSettings)
    }] satisfies readonly ClassicEditorGlobalSettingsSectionContribution[];
  },

  /**
   * Creates the font picker and Hub widget inside the shared formatting group.
   *
   * @returns One mounted font-library contribution.
   */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget",
      id: fontLibraryWidgetId,
      groupId: "home-format",
      order: 120,
      toolbar: createClassicFontFamilyToolbar
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  }
});
