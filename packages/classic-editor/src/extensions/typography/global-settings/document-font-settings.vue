<script setup lang="ts">
import { QuireCombobox, QuireField } from "@quirekit/ui/vue";
import {
  resolveBuiltinClassicEditorMessage,
  type BuiltinClassicEditorMessageKey
} from "../../../localization";
import type { ClassicEditorGlobalSettingsPanelState } from "../../../preset/builtin/global-settings";
import { useDocumentFontSettings } from "./use-document-font-settings";

const props = defineProps<{ state: ClassicEditorGlobalSettingsPanelState }>();
const {
  busyTarget,
  errorMessage,
  latinFamily,
  eastAsiaFamily,
  latinItems,
  eastAsiaItems,
  commitFamily
} = useDocumentFontSettings(props.state);

/**
 * Resolves product copy in the current panel locale.
 *
 * @param key - Stable built-in message key.
 * @returns Localized visible copy.
 */
function message(key: BuiltinClassicEditorMessageKey): string {
  return resolveBuiltinClassicEditorMessage(props.state.context.locale, key);
}
</script>

<template>
  <div class="qk-classic-editor__document-font-settings">
    <QuireField :label="message('eastAsianFont')" width="100%">
      <template #default="{ controlProps }">
        <QuireCombobox
          v-bind="controlProps"
          :label="message('eastAsianFont')"
          :model-value="eastAsiaFamily"
          :items="eastAsiaItems"
          :disabled="!state.context.editor.isEditable || busyTarget !== null"
          :loading="busyTarget === 'eastAsia'"
          :clearable="false"
          width="100%"
          border="subtle"
          @update:model-value="commitFamily('eastAsia', $event)"
        >
          <template #item="{ item }">
            <span :style="{ fontFamily: item.value }">{{ item.label }}</span>
          </template>
        </QuireCombobox>
      </template>
    </QuireField>
    <QuireField :label="message('latinFont')" width="100%">
      <template #default="{ controlProps }">
        <QuireCombobox
          v-bind="controlProps"
          :label="message('latinFont')"
          :model-value="latinFamily"
          :items="latinItems"
          :disabled="!state.context.editor.isEditable || busyTarget !== null"
          :loading="busyTarget === 'latin'"
          :clearable="false"
          width="100%"
          border="subtle"
          @update:model-value="commitFamily('latin', $event)"
        >
          <template #item="{ item }">
            <span :style="{ fontFamily: item.value }">{{ item.label }}</span>
          </template>
        </QuireCombobox>
      </template>
    </QuireField>
    <p v-if="errorMessage" class="qk-classic-editor__document-font-settings-error" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>
