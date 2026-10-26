import { HorizontalRule } from "@quirekit/extension-horizontal-rule";
import type { ClassicEditorRibbonWidgetContribution } from "../types";
import { createClassicHorizontalRuleToolbar } from "./horizontal-rule/toolbar";

/** Classic-aware Horizontal Rule Node with its existing action and placement. */
export const ClassicEditorHorizontalRule = HorizontalRule.extend({
  /**
   * Creates the Horizontal Rule ribbon control.
   *
   * @returns Horizontal Rule ribbon contribution.
   */
  addRibbonWidgets() {
    return [{
      kind: "ribbon-widget",
      id: "ribbon.rule",
      groupId: "insert-content",
      order: 240,
      toolbar: createClassicHorizontalRuleToolbar
    }] satisfies readonly ClassicEditorRibbonWidgetContribution[];
  }
});
