<script setup lang="ts">
import { QuireButton, QuireCheckbox, QuireInspectorSection, QuireSpace } from "@quirekit/ui/vue";
import type { ClassicEditorLocale } from "@classic/types";

defineProps<{
  /** Active product language. */ locale: ClassicEditorLocale;
  /** Effective selection value; undefined means mixed. */ checked: boolean | undefined;
  /** Whether the complete selection accepts formatting. */ disabled: boolean;
  /** Whether any direct override can be removed. */ canRestore: boolean;
}>();
const emit = defineEmits<{ /** A nullable direct character policy. */ change: [value: boolean | null] }>();
</script>
<template>
  <QuireInspectorSection :title="locale === 'zh-CN' ? '字符网格' : 'Character grid'">
    <QuireSpace orientation="vertical" gap="inline" block>
      <QuireCheckbox :label="locale === 'zh-CN' ? '文字参与字符网格' : 'Use character grid for selected text'"
        :description="locale === 'zh-CN' ? '在页面启用字符网格时生效。严格网格中，关闭后文字仍作为整体占格。' : 'Applies when the section has a character grid. In strict mode, excluded text still occupies whole cells as a block.'"
        :checked="checked === undefined ? 'indeterminate' : checked" :disabled="disabled"
        @update:checked="emit('change', $event === true)" />
      <QuireButton size="sm" variant="ghost" :disabled="disabled || !canRestore" @click="emit('change', null)">
        {{ locale === 'zh-CN' ? '恢复样式的字符网格设置' : 'Restore character grid from style' }}
      </QuireButton>
    </QuireSpace>
  </QuireInspectorSection>
</template>
