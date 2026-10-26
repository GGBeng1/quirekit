import { computed, markRaw } from "vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorToolbarContribution, ClassicEditorToolbarContributionState } from "@classic/types";
import { useClassicFontLibrary } from "./use-font-library";
import FontField from "./field.vue";
import FontSurface from "./surface.vue";

/**
 * Declares separate script selector, font field, and Font Hub entries.
 * @param state - Reactive host context owned by the Classic configuration adapter.
 * @returns Public toolbar configuration and the business dialog surface.
 */
export function createClassicFontFamilyToolbar(state: ClassicEditorToolbarContributionState): ClassicEditorToolbarContribution {
  const controller = useClassicFontLibrary(state);
  const items = computed<readonly QuireKitToolbarEntry[]>(() => [
    { value: "target", kind: "menu", trigger: "disclosure", label: controller.targetLabel.value,
      icon: "fontScript", items: controller.targetOptions.value, overlayProps: { width: "200px" } },
    { value: "family", kind: "custom", popup: "listbox", expanded: controller.pickerOpen.value, label: controller.message("fontFamily"), renderer: "field", disabled: !state.context.editor.isEditable },
    { value: "hub", kind: "disclosure", label: controller.message("manageFonts"), icon: "fontLibrary", expanded: controller.hubOpen.value }
  ]);
  return {
    items, context: controller, renderers: { field: markRaw(FontField) }, surface: markRaw(FontSurface),
    /** Dispatches a script change or opens the host-owned font dialog. @param event - Public toolbar intent. */
    execute(event) {
      if (event.item.value === "target") controller.selectFontTarget(event.value);
      else if (event.value === "hub") controller.openHub(event.nativeEvent);
    },
    /** @param event - Shared coordinator admission for the public font picker. */
    openChange(event) { if (event.item.value === "family") controller.pickerOpen.value = event.expanded; }
  };
}
