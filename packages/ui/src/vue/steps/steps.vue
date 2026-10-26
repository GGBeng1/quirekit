<script setup lang="ts">
import { Steps, useSteps, type UseStepsProps } from '@ark-ui/vue/steps';
import { computed, ref, watch } from 'vue';
import QuireIcon from '../icon/icon.vue';
import QuireEmptyState from '../empty-state/empty-state.vue';
import { normalizeStep } from './position';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitStepsProps, StepsSlots, StepsActions } from './types';
const props = withDefaults(defineProps<QuireKitStepsProps>(), {
  defaultValue: 0, linear: true, orientation: 'horizontal', density: 'comfortable', disabled: false, busy: false
});
const text = useQuireKitMessages('steps');
const emit = defineEmits<{ 'update:modelValue': [index: number]; complete: []; invalid: [index: number] }>();
defineSlots<StepsSlots>();
const local = ref(props.defaultValue);
const position = computed(() => normalizeStep(props.modelValue ?? local.value, props.items.length));
const paused = computed(() => props.disabled || props.busy || !props.items.length);
const completed = computed(() => !!props.items.length && position.value === props.items.length);
// Ark owns transitions and validation; the wrapper only projects unavailable targets.
const steps = useSteps(computed<UseStepsProps>(() => ({
  step: position.value, count: Math.max(1, props.items.length), linear: props.linear, orientation: props.orientation,
  ...(props.isStepValid ? { isStepValid: props.isStepValid } : {}),
  onStepChange: details => { local.value = details.step; emit('update:modelValue', details.step); },
  onStepInvalid: details => emit('invalid', details.step)
})));
watch(completed, (value, previous) => { if (value && !previous) emit('complete'); });
/** @param index - Candidate title or action target. @returns Whether that position is available. */
function available(index: number): boolean {
  return !paused.value && index >= 0 && index <= props.items.length && !props.items[index]?.disabled;
}
const canNext = computed(() => position.value < props.items.length && available(position.value + 1));
const canPrevious = computed(() => position.value > 0 && available(position.value - 1));
/** Requests one forward transition; Ark applies the synchronous validity rule. */
function next(): void { if (canNext.value) steps.value.goToNextStep(); }
/** Returns one position without changing host drafts. */
function previous(): void { if (canPrevious.value) steps.value.goToPrevStep(); }
/** @param index - Title-navigation target; linear mode only allows returning. */
function goTo(index: number): void {
  if (Number.isInteger(index) && available(index) && (!props.linear || index <= position.value)) steps.value.setStep(index);
}
/** Restarts navigation; resetting submitted data remains an explicit host action. */
function reset(): void { if (available(0)) steps.value.resetStep(); }
/** @param index - Linear title return, which Ark's default trigger deliberately ignores. */
function returnTo(index: number): void { if (props.linear) goTo(index); }
const actions = computed<StepsActions>(() => ({ index: position.value, canNext: canNext.value, canPrevious: canPrevious.value, completed: completed.value, next, previous, goTo, reset }));
defineExpose({ next, previous, goTo, reset, canNext, canPrevious, completed });
</script>
<template>
  <Steps.RootProvider :value="steps" :class="['qk-steps', `qk-steps--${density}`]" :aria-busy="busy || undefined">
    <QuireEmptyState v-if="!items.length" size="sm" :title="text.empty" />
    <template v-else>
      <div class="qk-steps__viewport">
        <Steps.List as-child role="list" :aria-owns="undefined" :aria-orientation="undefined" :aria-label="label" class="qk-steps__list">
          <ol>
            <Steps.Item v-for="(item, index) in items" :key="item.key" :index="index" as-child class="qk-steps__item">
              <li>
                <Steps.Trigger role="button" :aria-selected="undefined" :aria-current="index === position ? 'step' : undefined" :aria-controls="$slots.content ? steps.getItemState({index}).contentId : undefined" :tabindex="0" :disabled="!available(index) || (linear && index > position)" :data-unavailable="disabled || item.disabled ? '' : undefined" :class="['qk-steps__trigger', item.error && 'qk-steps__trigger--error']" @click="returnTo(index)">
                  <Steps.Indicator class="qk-steps__indicator" :data-error="item.error ? '' : undefined">
                    <slot name="indicator" :item="item" :index="index" :current="index === position" :completed="index < position">
                      <QuireIcon v-if="item.error" name="close" :size="16" />
                      <QuireIcon v-else-if="index < position" name="check" :size="16" />
                      <span v-else>{{ index + 1 }}</span>
                    </slot>
                  </Steps.Indicator>
                  <span class="qk-steps__copy">
                    <span class="qk-steps__title">{{ item.title }}<span v-if="index < position && !item.error" class="sr-only">{{ text.stepCompleted }}</span></span>
                    <span v-if="item.description" class="qk-steps__description">{{ item.description }}</span>
                    <span v-if="item.error" class="qk-steps__error">{{ item.error }}</span>
                    <span v-if="item.disabled && item.disabledReason" class="qk-steps__description">{{ item.disabledReason }}</span>
                  </span>
                </Steps.Trigger>
                <Steps.Separator v-if="index < items.length - 1" :class="['qk-steps__separator', orientation === 'vertical' && 'qk-steps__separator--vertical']" aria-hidden="true" />
              </li>
            </Steps.Item>
          </ol>
        </Steps.List>
      </div>
      <template v-if="$slots.content">
        <Steps.Content v-for="(item, index) in items" :key="item.key" :index="index" role="region" :tabindex="-1" class="qk-steps__content">
          <slot name="content" :item="item" :index="index" :current="index === position" :completed="index < position" />
        </Steps.Content>
      </template>
      <Steps.CompletedContent class="qk-steps__content"><slot name="completed"><p class="m-0">{{ text.completed }}</p></slot></Steps.CompletedContent>
    </template>
    <div v-if="$slots.actions" class="qk-steps__actions"><slot name="actions" v-bind="actions" /></div>
  </Steps.RootProvider>
</template>
