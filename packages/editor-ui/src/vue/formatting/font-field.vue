<script setup lang="ts">
import { computed } from "vue";
import { QuireCombobox, QuireToolbarField } from "@quirekit/ui/vue";
import type { EditorUIFontFieldProps } from "./types";
const props = defineProps<EditorUIFontFieldProps>();
const emit = defineEmits<{ select: [value: string | number | null | undefined] }>();
const width = computed(() => props.scope.item.span === undefined ? props.kind === "size" ? "72px" : "126px" : "100%");
</script>
<template>
 <QuireToolbarField v-slot="{ size }" :label="label" :expanded="scope.expanded" :width="width">
  <QuireCombobox v-bind="scope.item.attributes" :open="scope.expanded" @update:open="scope.setExpanded($event === true)"
   :size="size" :class="controlClass" :disabled="scope.disabled || busy" :loading="busy" :width="width" :content-width="kind === 'size' ? '152px' : '240px'"
   :show-search-icon="false" :clearable="false" :allow-custom-value="allowCustomValue ?? false"
   :model-value="value" :items="options" :content-props="contentProps ?? {}" :placeholder="placeholder" :data-format-state="formatState" :label="label"
   @update:model-value="emit('select', $event)">
   <template #item="{ item }"><span :style="{ fontFamily: options.find(option => option.value === item.value)?.family }">{{ item.label }}</span>
    <small v-if="options.find(option => option.value === item.value)?.availabilityMessage" style="color: var(--qk-color-text-tertiary)">{{ options.find(option => option.value === item.value)?.availabilityMessage }}</small>
   </template>
   <template v-if="emptyLabel" #empty>{{ emptyLabel }}</template>
  </QuireCombobox>
 </QuireToolbarField>
</template>
