<script setup lang="ts">
import { QuireCombobox, QuireField } from "@quirekit/ui/vue";
import type { EditorUIFontOption } from "./types";
withDefaults(defineProps<{
 /** Accessible field name. */ label: string;
 /** Canonical family option key. */ value: string | null;
 /** Inherited/mixed label. */ placeholder: string;
 /** Host-admitted resources. */ options: readonly EditorUIFontOption[];
 /** Editing/resource availability. */ disabled?: boolean;
 /** Optional popup owner used by asynchronous resource controllers. */ open?: boolean | undefined;
 /** Whether the product admits a local custom family. */ allowCustomValue?: boolean;
}>(), { open: undefined, allowCustomValue: false });
const emit = defineEmits<{ select: [value: string | null | undefined]; "update:open": [open: boolean] }>();
</script>
<template>
 <QuireField v-slot="{ controlProps }" width="100%" :label="label" :disabled="disabled">
  <QuireCombobox v-bind="controlProps" label="" size="sm" width="100%" :clearable="false" :allow-custom-value="allowCustomValue" :open="open" @update:open="emit('update:open', $event)"
   :model-value="value" :placeholder="placeholder" :items="options" @update:model-value="emit('select', $event)" />
 </QuireField>
</template>
