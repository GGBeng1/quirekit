<script setup lang="ts">
import { RatingGroup, useRatingGroup } from '@ark-ui/vue/rating-group';
import { useFieldContext } from '@ark-ui/vue/field';
import { computed, nextTick, ref, useAttrs, useId } from 'vue';
import QuireButton from '../button/button.vue';
import QuireIcon from '../icon/icon.vue';
import { useQuireKitMessages } from '../locale-provider/context';
import { ratingCount, ratingValue } from './value';
import type { QuireKitRatingProps, QuireKitRatingSlots } from './types';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitRatingProps>(), {
  hideLabel: false, defaultValue: 0, count: 5, allowHalf: false, size: 'md',
  clearable: false, showValue: true,
  disabled: undefined, readOnly: undefined, required: undefined, invalid: undefined
});
const model = defineModel<number>();
defineSlots<QuireKitRatingSlots>();
const attrs = useAttrs();
const text = useQuireKitMessages('rating');
const field = useFieldContext();
const root = ref<{ $el: HTMLElement }>();
const instanceId = `qk-rating-${useId()}`;
const count = computed(() => ratingCount(props.count));
const disabled = computed(() => props.disabled ?? field?.value.disabled ?? false);
const readOnly = computed(() => props.readOnly ?? field?.value.readOnly ?? false);
const required = computed(() => props.required ?? field?.value.required ?? false);
const invalid = computed(() => props.invalid ?? field?.value.invalid ?? false);
const labelId = computed(() => field?.value.ids.label ?? `${instanceId}-label`);
const accessibleLabelId = computed(() => typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : labelId.value);
const descriptionIds = computed(() => [...new Set(
  [attrs['aria-describedby'], field?.value.ariaDescribedby, `${instanceId}-value`]
    .filter((id): id is string => typeof id === 'string').flatMap(id => id.split(/\s+/)).filter(Boolean)
)].join(' '));
const rootAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([key]) => !['aria-describedby', 'aria-labelledby', 'aria-invalid', 'onFocus', 'onBlur'].includes(key))));
const api = useRatingGroup(computed(() => ({
  id: instanceId,
  ids: { label: labelId.value, hiddenInput: props.id ?? field?.value.ids.control ?? `${instanceId}-input` },
  defaultValue: ratingValue(props.defaultValue, count.value, props.allowHalf),
  ...(model.value === undefined ? {} : { modelValue: ratingValue(model.value, count.value, props.allowHalf) }),
  count: count.value, allowHalf: props.allowHalf, disabled: disabled.value, readOnly: readOnly.value,
  required: required.value, name: props.name ?? '', ...(props.form ? { form: props.form } : {}),
  onValueChange: updateValue
})));
const value = computed(() => ratingValue(api.value.value, count.value, props.allowHalf));
const valueText = computed(() => text.value.value(value.value, count.value));
const iconSize = computed(() => ({ sm: 16, md: 20, lg: 24 } as const)[props.size]);

/** Publishes Ark's changes using the public empty-score convention.
 * @param details - The score change produced by Ark.
 */
function updateValue(details: { value: number }): void {
  model.value = ratingValue(details.value, count.value, props.allowHalf);
}

/** Moves native Field/validation focus into Ark's selected radio or first empty item. */
function focus(): void {
  if (disabled.value) return;
  root.value?.$el.querySelector<HTMLElement>('[role="radio"][aria-checked="true"], [role="radio"][tabindex="0"]')?.focus();
}

/** Starts Ark's hover phase before the first item pointer move, preserving direct half clicks.
 * @param event - Native pointer entry into the group, including the pointer type.
 */
function beginPointerPreview(event: PointerEvent): void {
  api.value.getControlProps().onPointermove?.(event);
}

/** Hands keyboard ownership back to Ark's focus state after a pointer preview.
 * @param event - Original keyboard event, left untouched for Ark's item handler.
 */
function endPointerPreview(event: KeyboardEvent): void {
  // The public preview-exit handler only checks pointerType; keyboard events have none.
  api.value.getControlProps().onPointerleave?.(event as unknown as PointerEvent);
}

/** Clears through the upstream controller and restores a stable keyboard target.
 * @returns Completion after the empty state and focus target have updated.
 */
async function clear(): Promise<void> {
  if (disabled.value || readOnly.value) return;
  api.value.clearValue();
  await nextTick();
  focus();
}

/** Redirects native required validation to the visible rating interaction.
 * @param event - Invalid event emitted by the native submitted control.
 */
function onInvalid(event: Event): void {
  event.preventDefault();
  focus();
}

/** Computes an accessible name from the committed score rather than the hover preview.
 * @param index - One-based rendered star index.
 * @returns A localized integer or committed half-score radio name.
 */
function itemName(index: number): string {
  return text.value.item(Math.ceil(value.value) === index ? value.value : index, count.value);
}

defineExpose({ focus });
</script>

<template>
  <RatingGroup.RootProvider ref="root" v-bind="rootAttrs" :value="api"
    :data-invalid="invalid ? '' : undefined"
    :data-size="size" class="qk-rating">
    <RatingGroup.Label v-if="!field" :class="['qk-rating__label', hideLabel && 'sr-only']">
      {{ label }}<span v-if="required" aria-hidden="true" class="qk-rating__required">*</span>
    </RatingGroup.Label>
    <div class="qk-rating__row">
      <RatingGroup.Control class="qk-rating__control" @pointerenter="beginPointerPreview" @keydown.capture="endPointerPreview" :aria-labelledby="accessibleLabelId"
        :aria-describedby="descriptionIds" :aria-invalid="invalid || undefined" :aria-required="required || undefined">
        <RatingGroup.Item v-for="index in api.items" :key="index" :index="index"
          v-bind="disabled ? { tabindex: -1 } : {}"
          :aria-label="itemName(index)" :aria-checked="value > 0 && Math.ceil(value) === index"
          :class="['qk-rating__item', `qk-rating__item--${size}`]">
          <span class="qk-rating__glyph" aria-hidden="true">
            <QuireIcon name="star" :size="iconSize" />
            <span class="qk-rating__fill"><QuireIcon name="star" :size="iconSize" /></span>
          </span>
        </RatingGroup.Item>
      </RatingGroup.Control>
      <span :id="`${instanceId}-value`" :class="['qk-rating__value', !showValue && 'sr-only']">
        <slot name="value" :value="value" :count="count">{{ valueText }}</slot>
      </span>
      <QuireButton v-if="clearable && !readOnly && !disabled" size="xs" variant="ghost" :disabled="value === 0" @click="clear">
        {{ text.clear }}
      </QuireButton>
    </div>
    <!-- Retain Ark's form/reset owner, while making required validation focusable through the visible radios. -->
    <RatingGroup.HiddenInput :hidden="false" tabindex="-1" class="sr-only" :aria-label="label"
      :aria-invalid="invalid || undefined" :pattern="required ? '(?:[1-9][0-9]*(?:[.]5)?|0[.]5)' : undefined"
      @focus="focus" @invalid="onInvalid" />
  </RatingGroup.RootProvider>
</template>
