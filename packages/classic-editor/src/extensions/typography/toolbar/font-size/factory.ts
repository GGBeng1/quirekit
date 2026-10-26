import { computed, markRaw, ref } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import FontSizeField from "./field.vue";

/**
 * Declares the size field and two independent commands in the shared Toolbar.
 * @param state - Stable state whose context follows the current selection and locale.
 * @returns Public entries and the single field renderer; no private action buttons.
 */
export function createClassicFontSizeToolbar(state: ClassicEditorToolbarContributionState): ClassicEditorToolbarContribution {
  const expanded = ref(false);
  const items = computed<readonly QuireKitToolbarEntry[]>(() => [
    { value: "size", kind: "custom", popup: "listbox", expanded: expanded.value, label: resolveBuiltinClassicEditorMessage(state.context.locale, "fontSize"), renderer: "size", disabled: !state.context.editor.isEditable },
    { value: "increase", label: resolveBuiltinClassicEditorMessage(state.context.locale, "increaseFontSize"), icon: "fontSizeIncrease", disabled: !state.context.editor.isEditable },
    { value: "decrease", label: resolveBuiltinClassicEditorMessage(state.context.locale, "decreaseFontSize"), icon: "fontSizeDecrease", disabled: !state.context.editor.isEditable }
  ]);
  return {
    items, context: state, renderers: { size: markRaw(FontSizeField) },
    /** @param event - Admitted field visibility; popup coordination belongs to the host. */
    openChange(event) { if (event.item.value === "size") expanded.value = event.expanded; },
    /** @param event - Accepted intent from one public size action. */
    execute(event): void {
      if (!state.context.editor.isEditable) return;
      if (event.value === "increase") state.context.editor.commands.increaseFontSize();
      else if (event.value === "decrease") state.context.editor.commands.decreaseFontSize();
      state.context.instance.refreshProductUi();
    }
  };
}
