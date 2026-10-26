<script setup lang="ts">
import { ref, useId } from 'vue';
import type { QuireKitPresetGalleryItem, QuireKitPresetGalleryItemSlotProps } from '../../components/preset-gallery';
import type { PresetActionCardsProps, PresetActionCardsSlots } from './types';
import QuireIcon from '../icon/icon.vue';
import QuireEmptyState from '../empty-state/empty-state.vue';
import { useQuireKitMessages } from '../locale-provider/context';
const props = defineProps<PresetActionCardsProps>();
const emit = defineEmits<{
  /** Submit a card without activating any of its actions. */ select: [value: string];
  /** Track the focused candidate without selecting it. */ highlight: [value: string];
}>();
defineSlots<PresetActionCardsSlots>();
const text = useQuireKitMessages('presetGallery');
const root = ref<HTMLElement>(), id = `qk-preset-actions-${useId()}`;

/** @param item - Visible choice. @returns Consistent state for preview and independent actions. */
function context(item: QuireKitPresetGalleryItem): QuireKitPresetGalleryItemSlotProps {
  return { item, selected: props.value === item.value, highlighted: props.highlighted === item.value, disabled: props.disabled || item.disabled === true };
}
/** @param event - Native button activation. @param item - Requested selection. */
function select(event: MouseEvent, item: QuireKitPresetGalleryItem): void {
  if (!event.defaultPrevented && event.button === 0 && !context(item).disabled) emit('select', item.value);
}
/** @param event - Key on the selection button, never on an action. @param index - Source card index. */
function navigate(event: KeyboardEvent, index: number): void {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || props.disabled) return;
  if (event.key === 'Enter' || event.key === ' ') { if (event.repeat) event.preventDefault(); return; }
  const buttons = [...(root.value?.querySelectorAll<HTMLButtonElement>('.qk-preset-gallery__select') ?? [])];
  const rtl = getComputedStyle(root.value!).direction === 'rtl';
  const step = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1)
    : event.key === 'ArrowDown' ? props.columns : event.key === 'ArrowUp' ? -props.columns : 0;
  let next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index + step;
  if (!step && event.key !== 'Home' && event.key !== 'End') return;
  event.preventDefault();
  // Native buttons own activation and Tab order; arrows only browse enabled cards.
  const stride = step || (event.key === 'Home' ? 1 : -1);
  while (next >= 0 && next < buttons.length && buttons[next]?.disabled) next += stride;
  buttons[next]?.focus();
}
</script>
<template>
  <div ref="root" role="group" :aria-labelledby="`${id}-label`" class="qk-preset-gallery__management">
    <p :id="`${id}-label`" :class="['qk-preset-gallery__heading', hideLabel && 'qk-listbox__visually-hidden']">{{ label }}</p>
    <div class="qk-preset-gallery__grid qk-preset-gallery__grid--actions">
      <div v-for="(item, index) in items" :key="item.value" class="qk-preset-gallery__card">
        <button type="button" class="qk-preset-gallery__select" :aria-label="item.label" :aria-pressed="value === item.value"
          :aria-describedby="item.description ? `${id}-${index}-description` : undefined" :disabled="context(item).disabled"
          @click="select($event, item)" @focus="emit('highlight', item.value)" @keydown="navigate($event, index)">
          <span class="qk-preset-gallery__card-heading">
            <QuireIcon name="check" class="qk-preset-gallery__check" :data-selected="value === item.value ? '' : undefined" />
            <span class="qk-preset-gallery__label" :data-selected="value === item.value ? '' : undefined">{{ item.label }}</span>
          </span>
          <span class="qk-preset-gallery__preview" aria-hidden="true"><slot name="preview" v-bind="context(item)"><span class="qk-preset-gallery__sample">Aa</span></slot></span>
          <span v-if="item.description" :id="`${id}-${index}-description`" class="qk-preset-gallery__description">{{ item.description }}</span>
        </button>
        <div class="qk-preset-gallery__actions"><slot name="actions" v-bind="context(item)" /></div>
      </div>
    </div>
    <slot v-if="!items.length" name="empty"><QuireEmptyState :title="text.empty" size="sm" /></slot>
  </div>
</template>
