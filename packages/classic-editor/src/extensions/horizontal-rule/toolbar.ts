import { computed, markRaw } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import Gallery from "./gallery.vue";

/**
 * Declares the horizontal-rule trigger while retaining the domain preset body.
 * @param state - Reactive host context.
 * @returns Public disclosure and the Word-neutral rule gallery.
 */
export function createClassicHorizontalRuleToolbar(state: ClassicEditorToolbarContributionState): ClassicEditorToolbarContribution {
  return {
    items: computed<readonly QuireKitToolbarEntry[]>(() => {
      const label = resolveBuiltinClassicEditorMessage(state.context.locale, "horizontalRule");
      return [{ value: "rule", kind: "disclosure", indicator: true, label, text: label, icon: "horizontalRule",
        disabled: !state.context.editor.isEditable, contentPadding: "none", contentRenderer: "gallery" }];
    }), context: state, renderers: { gallery: markRaw(Gallery) }
  };
}
