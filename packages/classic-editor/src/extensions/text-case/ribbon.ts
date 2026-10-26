import { computed } from "vue";
import type { TextCaseMode } from "@quirekit/extensions";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "../../types";
import { classicEditorTextCaseLabel, classicEditorTextCaseModes } from "./actions";

/**
 * Creates the Home "Aa" menu.
 *
 * @param state - Latest mounted ribbon context.
 * @returns Toolbar contribution with one disclosure menu.
 */
export function createClassicEditorTextCaseRibbon(state: ClassicEditorToolbarContributionState): ClassicEditorToolbarContribution {
  const zh = () => state.context.locale === "zh-CN";
  return {
    items: computed<readonly QuireKitToolbarEntry[]>(() => [{
      value: "text-case", kind: "menu", trigger: "disclosure", indicator: true, icon: "caseSensitive",
      label: classicEditorTextCaseLabel[zh() ? "zh-CN" : "en"], attributes: { "data-action": "text-case" },
      disabled: !state.context.editor.isEditable,
      items: classicEditorTextCaseModes.map(({ mode, label }) => ({ value: mode, label: label[zh() ? "zh-CN" : "en"] }))
    }]),
    /** @param event - Chosen mode. @returns Whether the text changed. */
    execute(event) {
      const mode = classicEditorTextCaseModes.find(row => row.mode === event.value)?.mode;
      if (mode === undefined || !state.context.editor.commands.changeTextCase(mode as TextCaseMode)) return false;
      // Like Word, keep typing in the document after choosing from the ribbon menu.
      state.context.editor.commands.focus(null, { scrollIntoView: false });
      return true;
    }
  };
}
