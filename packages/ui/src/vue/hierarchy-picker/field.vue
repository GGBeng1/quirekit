<script setup lang="ts">
import { ref } from 'vue';
import { useHierarchyForm } from './use-form';
import { ark } from '@ark-ui/vue/factory';
import QuireIconButton from '../button/icon-button.vue';
import QuireIcon from '../icon/icon.vue';
import QuireInput from '../input/input.vue';
import { QuirePopoverRoot, QuirePopoverTrigger, QuirePopoverContent, QuirePopoverTitle } from '../popover';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitHierarchyPickerProps } from './types';

const ArkButton = ark.button;

/** Internal field shell, shared by both hierarchy selection views. */
interface Props extends QuireKitHierarchyPickerProps {
  /** Current display text. */
  readonly display: string;
  /** Effective committed ids. */
  readonly value: string[];
  /** Independent search query. */
  readonly query: string;
  /** Allows independently positioned descendant surfaces outside the root box. */
  readonly flyouts?: boolean;
}
const props = defineProps<Props>();
const text = useQuireKitMessages('hierarchyPicker');
const emit = defineEmits<{
  /** Popup transition. */
  'update:open': [open: boolean];
  /** Search changes without selecting. */
  'update:query': [query: string];
  /** Explicit clear action. */
  clear: [];
  /** Native form reset. */
  reset: [];
}>();
defineSlots<{ /** Selection view content. */ default(): unknown }>();
const root = ref<HTMLElement>();
const validation = ref<HTMLSelectElement>();
useHierarchyForm(validation, () => props.value, () => emit('reset'));
/** Returns focus to the persistent field trigger. */
function focusTrigger(): void { root.value?.querySelector<HTMLButtonElement>('[data-part="trigger"]')?.focus(); }
/** Clears the selection while keeping a predictable keyboard target. */
function clear(): void { emit('clear'); focusTrigger(); }
</script>

<template>
  <div ref="root" class="qk-hierarchy-picker" :style="{ width: width ?? '280px' }" :data-invalid="invalid || undefined">
    <QuirePopoverRoot :open="open ?? false" :portalled="portalled ?? true" @update:open="emit('update:open', $event)">
      <div class="qk-hierarchy-picker__control">
        <QuirePopoverTrigger as-child>
          <component :is="ArkButton" type="button" class="qk-select__trigger qk-select__trigger--sm qk-hierarchy-picker__trigger"
            :disabled="disabled" :aria-disabled="readOnly || undefined" :aria-invalid="invalid || undefined"
            :aria-label="text.trigger(label, display || placeholder || text.placeholder)" :title="display"
            @click.capture="readOnly && $event.preventDefault()">
            <span :class="['qk-hierarchy-picker__value', !display && 'text-qk-text-tertiary']">{{ display || placeholder || text.placeholder }}</span>
            <QuireIcon name="chevronDown" :size="16" />
          </component>
        </QuirePopoverTrigger>
        <QuireIconButton v-if="clearable !== false && value.length && !disabled && !readOnly" :label="text.clear(label)"
          size="xs" variant="text" class="qk-hierarchy-picker__clear" @click="clear"><QuireIcon name="close" :size="12" /></QuireIconButton>
      </div>
      <QuirePopoverContent :show-arrow="false" border="subtle" :class="['qk-hierarchy-picker__popup', flyouts && 'qk-hierarchy-picker__popup--flyouts']">
        <QuirePopoverTitle class="sr-only">{{ label }}</QuirePopoverTitle>
        <div v-if="searchable !== false" class="qk-hierarchy-picker__search">
          <QuireInput :model-value="query" :aria-label="text.search(label)" :placeholder="searchPlaceholder ?? text.searchPlaceholder"
            width="100%" clearable @update:model-value="emit('update:query', $event)" />
        </div>
        <slot />
      </QuirePopoverContent>
    </QuirePopoverRoot>
    <!-- Native validation owns required semantics; hidden successful controls preserve id order. -->
    <select ref="validation" class="sr-only" tabindex="-1" aria-hidden="true" :form="form"
      :disabled="disabled" :required="required && !readOnly" :value="value.length ? 'selected' : ''" @focus="focusTrigger">
      <option value="" /><option value="selected">{{ display }}</option>
    </select>
    <input v-for="(id, index) in value" :key="`${index}:${id}`" type="hidden" :name="name" :form="form" :value="id" :disabled="disabled" />
  </div>
</template>
