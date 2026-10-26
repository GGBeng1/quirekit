<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { QuireButton, QuireColorEditor, QuireColorPalette, QuireColorPickerRoot } from "@quirekit/ui/vue";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicColorToolbarController } from "./types";

const props = defineProps<{
  /** Existing color owner projected into an inline submenu body. */
  scope: QuireKitToolbarRendererScope;
}>();
const controller = props.scope.context as ClassicColorToolbarController;
const { editableColor, resetActive, recentColors, labels, palette } = controller;
const draft = ref(editableColor.value);
const precise = ref(false);
const surface = ref<HTMLElement>();
const english = props.scope.item.overlayProps?.contentAttributes?.lang === "en";
/** @param color - Chosen preset or complete precise-color draft. */
function commit(color: string): void {
  // The host completes the accepted command and restores editor input even if
  // the resulting transaction unmounts this captured menu before the next tick.
  props.scope.execute(color);
}
/** @param event - Fields and swatches own their keyboard; Escape remains a submenu action. */
function keydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") event.stopPropagation();
}
// Native menus highlight menuitems; the embedded palette owns ordinary controls.
// Enter its first swatch after mount so ArrowRight also works without a pointer.
onMounted(() => { void nextTick(() => surface.value?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true })); });
</script>

<template>
  <div ref="surface" @keydown="keydown">
    <QuireColorPickerRoot v-model="draft" inline :disabled="scope.disabled">
      <QuireColorPalette v-if="!precise" class="qk-classic-color-menu-content" v-bind="{ ...labels, ...palette }" :recent-colors="recentColors" :reset-active="resetActive"
        :close-on-commit="false" @commit="commit" @reset="scope.execute(null)" @more="precise = true" />
      <template v-else>
        <QuireColorEditor class="qk-classic-color-menu-content" :show-alpha="false" show-back @back="precise = false" />
        <div style="display: flex; justify-content: flex-end; padding: var(--qk-space-inline)">
          <QuireButton size="sm" @click="commit(draft)">{{ english ? 'Apply' : '应用' }}</QuireButton>
        </div>
      </template>
    </QuireColorPickerRoot>
  </div>
</template>

<style>
.qk-classic-color-menu-content { padding: var(--qk-space-inline); }
</style>
