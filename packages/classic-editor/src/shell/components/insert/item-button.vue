<script setup lang="ts">
import { computed } from "vue";
import type { ClassicEditorLocale } from "../../../types";
import type { ResolvedClassicEditorInsertItem } from "../../../types/insert";
import { getClassicEditorInsertCapabilityLabel } from "./localization";

/** Inputs for one action-backed Insert discovery button. */
interface ClassicEditorInsertItemButtonProps {
  /** Localized, live-resolved item facts. */
  readonly item: ResolvedClassicEditorInsertItem;
  /** Mounted product locale. */
  readonly locale: ClassicEditorLocale;
  /** Whether this occurrence uses the visual gallery treatment. */
  readonly gallery?: boolean | undefined;
  /** Whether another Insert action is currently awaiting a receipt. */
  readonly busy?: boolean | undefined;
}

/** Events emitted without routing an action id. */
interface ClassicEditorInsertItemButtonEmits {
  /** Retains and returns the exact resolved item selected by the user. */
  activate: [item: ResolvedClassicEditorInsertItem];
}

const props = withDefaults(defineProps<ClassicEditorInsertItemButtonProps>(), {
  gallery: false,
  busy: false
});
const emit = defineEmits<ClassicEditorInsertItemButtonEmits>();
const badge = computed(() => getClassicEditorInsertCapabilityLabel(
  props.locale,
  props.item.capability
));

/** Emits the retained item so the owning catalog can revalidate its action closure. */
function activate(): void {
  emit("activate", props.item);
}
</script>

<template>
  <button
    type="button"
    class="qk-classic-insert-item"
    :class="{ 'qk-classic-insert-item--gallery': gallery }"
    :data-insert-item="item.definition.id"
    :data-insert-group="item.definition.group"
    :data-capability="item.capability"
    :aria-disabled="!item.canExecute || busy"
    :title="item.reason ?? item.label"
    tabindex="-1"
    @click="activate"
  >
    <span class="qk-classic-insert-item__preview" aria-hidden="true">
      {{ item.preview ?? item.label.slice(0, 1).toLocaleUpperCase(locale) }}
    </span>
    <span class="qk-classic-insert-item__body">
      <span class="qk-classic-insert-item__heading">
        <span class="qk-classic-insert-item__label">{{ item.label }}</span>
        <span v-if="badge" class="qk-classic-insert-item__badge">{{ badge }}</span>
      </span>
      <span v-if="item.description" class="qk-classic-insert-item__description">
        {{ item.description }}
      </span>
      <span v-if="!item.canExecute && item.reason" class="qk-classic-insert-item__reason">
        {{ item.reason }}
      </span>
    </span>
  </button>
</template>
