<script setup lang="ts">
import { computed, toRef } from "vue";
import { QuireToolbar, QuireMenuSeparator } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarRow } from "@quirekit/ui";
import type { ClassicEditorShellModel } from "../../../types";
import type { ClassicEditorSelectionPopupTrigger } from "@classic/types";
import Producer from "../../../contribution/toolbar/producer.vue";
import { useBlockFormatting } from "./use-formatting";
import FeatureSubmenu from "./feature-submenu.vue";

const props = defineProps<{
  /** Mounted editor and presentation context. */
  model: ClassicEditorShellModel;
  /** Complete range owned by this menu. */
  trigger: ClassicEditorSelectionPopupTrigger;
  /** Feature-owned paragraph style conversions. */
  types: readonly QuireKitToolbarEntry[];
  /** Parent surface for palette and alignment ownership. */
  parentId: string;
  /** Document overlay host shared with retained producers. */
  portalTarget: HTMLElement;
}>();
const emit = defineEmits<{
  /** Existing type conversion chosen from the direct grid. */
  convert: [value: string];
  /** Completed format command. */
  close: [];
}>();
const { adapter, widgets, direct, indents, submenus, register, release, isTargetCurrent, execute } = useBlockFormatting(toRef(props, "model"), props.trigger);
const label = computed(() => props.model.locale === "en" ? "Block type" : "块类型");
const rows = computed<readonly QuireKitToolbarRow[]>(() => {
  const items = [...props.types, ...direct.value];
  return Array.from({ length: Math.ceil(items.length / 5) }, (_, index) => ({
    value: `block-types-${index}`, label: label.value, items: items.slice(index * 5, index * 5 + 5)
  }));
});
/** @param event - A single public toolbar activation with the captured target. */
async function activate(event: QuireKitToolbarExecuteEvent): Promise<void> {
  if (!isTargetCurrent()) return;
  if (props.types.some(item => item.value === event.value)) emit("convert", event.value);
  else { await execute(event); emit("close"); }
}
/** @param event - Vertical navigation leaving the horizontal direct-action toolbar. */
function enterMenuRows(event: KeyboardEvent): void {
  if (event.defaultPrevented || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
  // Keep the original key event for Menu's active-descendant navigation; only
  // transfer focus so the next ArrowRight belongs to its highlighted submenu.
  (event.currentTarget as HTMLElement).closest<HTMLElement>('[role="menu"]')?.focus({ preventScroll: true });
}
</script>

<template>
  <div style="display: flex; justify-content: center" @keydown="enterMenuRows">
    <QuireToolbar :rows="rows" :label="label" align="start" overflow="visible" preserve-focus data-block-types @execute="activate" />
  </div>
  <QuireMenuSeparator />
  <FeatureSubmenu v-for="item in submenus" :key="item.value" :item="item" :adapter="adapter" :indents="indents" @execute="activate" />
  <Producer v-for="item in widgets" :key="item.id" :feature-key="item.id" :factory="item.toolbar"
    :context="model.context!" active :open="false" :parent-id="parentId" :portal-target="portalTarget"
    :is-target-current="isTargetCurrent" @configuration="register" @release="release" />
</template>
