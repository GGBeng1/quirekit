<script setup lang="ts">
import { PinInput } from '@ark-ui/vue/pin-input';
import { useFieldContext } from '@ark-ui/vue/field';
import type { PinInputValueChangeDetails } from '@ark-ui/vue/pin-input';
import { computed, ref, useAttrs, useId, watch } from 'vue';
import type { QuireKitPinInputProps, QuireKitPinInputValueInvalidDetails } from './types';
import { usePinInputFormReset } from './form';
import { useQuireKitMessages } from '../locale-provider/context';

defineOptions({ inheritAttrs: false });

/** Public updates keep business submission separate from entering a complete code. */
interface Emits {
  /** Requests an update to the controlled string. */
  'update:modelValue': [value: string];
  /** Reports the latest code after an accepted edit. */
  valueChange: [value: string];
  /** Reports the transition from incomplete to complete, without auto-submitting. */
  valueComplete: [value: string];
  /** Reports rejected characters, leaving the current code unchanged. */
  valueInvalid: [details: QuireKitPinInputValueInvalidDetails];
  /** Lets the consumer show feedback for an incomplete native form value. */
  invalid: [event: Event];
}

const props = withDefaults(defineProps<QuireKitPinInputProps>(), {
  defaultValue: '', length: 4, type: 'numeric', size: 'sm',
  disabled: undefined, readOnly: undefined, required: undefined, invalid: undefined,
  otp: false, mask: false, placeholder: ''
});
const emit = defineEmits<Emits>();
const attrs = useAttrs();
const text = useQuireKitMessages('pinInput');
const field = useFieldContext();
const machineId = `qk-pin-${useId()}`;
const hiddenInput = ref<HTMLInputElement>();
const internalCharacters = ref((props.modelValue ?? props.defaultValue).split(''));
const count = computed(() => Number.isInteger(props.length) && props.length > 0 ? props.length : 4);
// Preserve the upstream array across its string-model echo; only a different external
// string replaces its cell positions. A rejecting controlled owner keeps the prior value.
const characters = computed(() => (props.modelValue === undefined || props.modelValue === internalCharacters.value.join('')
  ? internalCharacters.value : props.modelValue.split('')).slice(0, count.value));
const fieldState = computed(() => ({
  disabled: props.disabled ?? field?.value.disabled ?? false,
  readOnly: props.readOnly ?? field?.value.readOnly ?? false,
  required: props.required ?? field?.value.required ?? false,
  invalid: props.invalid ?? field?.value.invalid ?? false
}));
const accessibleLabel = computed(() => String(attrs['aria-label'] ?? props.label ?? text.value.label));
// Rebuilt on language or label changes so Ark re-renders the positional cell names.
const translations = computed(() => {
  const { cell } = text.value;
  const label = accessibleLabel.value;
  return { inputLabel: (index: number, length: number) => cell(label, index, length) };
});
const ids = computed(() => ({ root: `${machineId}-root`, hiddenInput: `${machineId}-value`, input: inputId }));
const rootAttrs = computed(() => Object.fromEntries(Object.entries(attrs)
  .filter(([key]) => !['aria-describedby', 'aria-errormessage', 'data-scope', 'data-part'].includes(key))));
const inputFeedback = computed(() => {
  const description = attrs['aria-describedby'];
  const error = attrs['aria-errormessage'];
  return {
    'aria-describedby': typeof description === 'string' ? description : field?.value.ariaDescribedby,
    'aria-errormessage': typeof error === 'string' ? error : field?.value.getInputProps()['aria-errormessage']
  };
});
const nativePattern = computed(() => `${{ numeric: '[0-9]', alphabetic: '[a-zA-Z]', alphanumeric: '[a-zA-Z0-9]' }[props.type]}{${count.value}}`);
const optionalProps = computed(() => ({
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.form === undefined ? {} : { form: props.form }),
  ...(props.sanitizeValue === undefined ? {} : { sanitizeValue: props.sanitizeValue })
}));

watch(() => props.modelValue, (value) => {
  if (value !== undefined && value !== internalCharacters.value.join('')) internalCharacters.value = value.split('');
});
usePinInputFormReset(hiddenInput, () => updateValue(props.defaultValue.slice(0, count.value)));

/** Keep Field's label associated with the first real input.
 * @param index - Ark's zero-based input index.
 * @returns A stable native input identity.
 */
function inputId(index: string): string {
  return index === '0' ? (props.id ?? field?.value.ids.control ?? `${machineId}-0`) : `${machineId}-${index}`;
}


/** Publish an accepted edit or explicit native reset.
 * @param value - The complete current string, possibly incomplete.
 */
function updateValue(value: string): void {
  internalCharacters.value = value.split('');
  emit('update:modelValue', value);
  emit('valueChange', value);
}

/** Project Ark's string value without owning its keyboard state.
 * @param details - Ark's accepted input change.
 */
function onValueChange(details: PinInputValueChangeDetails): void {
  if (fieldState.value.disabled || fieldState.value.readOnly) return;
  internalCharacters.value = [...details.value];
  emit('update:modelValue', details.valueAsString);
  emit('valueChange', details.valueAsString);
}

/** Guard upstream mutation handlers while leaving navigation and copying available.
 * @param event - Captured keyboard, beforeinput or paste event.
 */
function guardMutation(event: Event): void {
  if (!fieldState.value.disabled && !fieldState.value.readOnly) return;
  if (event instanceof KeyboardEvent && !['Backspace', 'Delete', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
}

/** Move native validation feedback from the serialization input to a visible cell.
 * @param event - Native validation failure, forwarded for consumer feedback.
 */
function onNativeInvalid(event: Event): void {
  event.preventDefault();
  emit('invalid', event);
  hiddenInput.value?.parentElement?.querySelector<HTMLInputElement>('[data-part="input"]')?.focus();
}
</script>

<template>
  <PinInput.Root :key="`${count}:${form ?? ''}`" v-bind="{ ...rootAttrs, ...optionalProps }"
    :id="machineId" :ids="ids" :count="count" :model-value="characters" :type="type"
    :disabled="fieldState.disabled" :read-only="fieldState.readOnly" :required="fieldState.required" :invalid="fieldState.invalid"
    :otp="otp" :mask="mask" :placeholder="placeholder" :select-on-focus="true"
    :auto-submit="false" :blur-on-complete="false" :translations="translations"
    role="group" :aria-label="accessibleLabel"
    :class="['qk-pin-input', `qk-pin-input--${size}`]"
    @value-change="onValueChange"
    @value-complete="emit('valueComplete', $event.valueAsString)"
    @value-invalid="emit('valueInvalid', $event)"
    @keydown.capture="guardMutation" @beforeinput.capture="guardMutation" @paste.capture="guardMutation">
    <PinInput.Control class="qk-pin-input__control">
      <PinInput.Input v-for="index in count" :key="index" :index="index - 1" v-bind="inputFeedback"
        :inputmode="type === 'numeric' ? 'numeric' : 'text'"
        :aria-required="fieldState.required || undefined" class="qk-pin-input__input" />
    </PinInput.Control>
    <PinInput.Context v-slot="api">
      <input ref="hiddenInput" v-bind="api.getHiddenInputProps()" :pattern="nativePattern" @invalid="onNativeInvalid">
    </PinInput.Context>
  </PinInput.Root>
</template>
