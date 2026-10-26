import { TextCase } from "@quirekit/extensions";
import type { ClassicEditorRibbonWidgetContribution } from "../../types";
import { createClassicEditorSelectionPopupAction } from "../surfaces";
import { classicEditorTextCaseActions, classicEditorTextCaseLabel, classicEditorTextCaseModes } from "./actions";
import { createClassicEditorTextCaseRibbon } from "./ribbon";

/** Classic-aware Change Case: Home "Aa" menu and a selection popup submenu. */
export const ClassicEditorTextCase = TextCase.extend({
  /** @returns The Home font-group menu. */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget", id: "ribbon.text-case", groupId: "home-format", order: 124.8,
      toolbar: createClassicEditorTextCaseRibbon
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  },

  /** @returns One overflow submenu row per mode. */
  addSelectionPopupItems() {
    return classicEditorTextCaseModes.map(({ mode }, index) => ({
      ...createClassicEditorSelectionPopupAction(`selection.text-case.${mode}`, classicEditorTextCaseActions[mode]),
      placement: "overflow" as const,
      submenu: classicEditorTextCaseLabel,
      order: 505 + index / 10
    }));
  }
});
