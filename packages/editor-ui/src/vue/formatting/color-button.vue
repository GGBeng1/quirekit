<script setup lang="ts">
import { QuireColorPicker, QuireIcon, QuireToolbarColorPickerDisclosure, QuireToolbarSplitButton } from "@quirekit/ui/vue";
import type { EditorUIColorButtonProps } from "./types";
defineProps<EditorUIColorButtonProps>();
const emit = defineEmits<{ action: []; preview: [color: string]; commit: [color: string]; reset: [] }>();
</script>
<template>
 <QuireToolbarSplitButton :label="scope.item.label" :action-label="scope.item.label" :disclosure-label="disclosureLabel"
  :disabled="scope.disabled" :expanded="scope.expanded" v-bind="actionState" popup="dialog" @action="emit('action')">
  <QuireIcon :name="scope.item.icon" :accent-color="scope.item.iconAccentColor" :empty="scope.item.iconEmpty" />
  <template #disclosure>
   <QuireColorPicker v-bind="{ ...pickerProps, ...(scope.item.overlayProps?.portalTarget ? { portalTarget: scope.item.overlayProps.portalTarget } : {}) }" :model-value="color" :reset-active="resetActive" :open="scope.expanded"
    :content-attributes="scope.item.overlayProps?.contentAttributes ?? {}"
    :label="disclosureLabel" :disabled="scope.disabled" :recent-colors="recentColors" :show-alpha="false"
    @update:model-value="emit('preview', $event)" @update:open="scope.setExpanded" @commit="emit('commit', $event)" @reset="emit('reset')">
    <template #trigger><QuireToolbarColorPickerDisclosure v-bind="scope.item.attributes" class="qk-toolbar__split-disclosure" :label="disclosureLabel" :disabled="scope.disabled"><QuireIcon name="chevronDown" /></QuireToolbarColorPickerDisclosure></template>
   </QuireColorPicker>
  </template>
 </QuireToolbarSplitButton>
</template>
