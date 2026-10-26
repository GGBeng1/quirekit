<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import ComposerInput from '../composer-input/composer-input.vue';
import ComposerSubmit from '../composer-submit/composer-submit.vue';
import LocaleScope from '../shared/locale-scope.vue';
import { useQuireKitMessages } from '../../locale-provider/context';
import type { QuireKitChatComposerContext, QuireKitChatComposerInputInstance, QuireKitChatComposerProps, QuireKitChatComposerSlots, QuireKitChatSubmitDetails } from '../../../components/chat';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitChatComposerProps>(), {
  busy: false, disabled: false, readOnly: false,
  layout: 'panel', density: 'comfortable', variant: 'outline', size: 'md', submitMode: 'enter', maxRows: 8,
  hasContent: false, submitDisabled: false, submitAppearance: 'icon', submitColor: 'primary'
});
const emit = defineEmits<{
  /** 草稿输入；宿主同步更新 modelValue。 */
  'update:modelValue': [value: string];
  /** 发送原始草稿；组件不清空内容。 */
  submit: [details: QuireKitChatSubmitDetails];
  /** 停止当前处理；实际取消由宿主执行。 */
  stop: [];
}>();
defineSlots<QuireKitChatComposerSlots>();
const text = useQuireKitMessages('chat');
const label = computed(() => props.label ?? text.value.composer.label);
const input = ref<QuireKitChatComposerInputInstance>();
const fileDragging = ref(false);
const footerId = `qk-composer-footer-${useId()}`;
const minRows = computed(() => props.rows ?? (props.layout === 'inline' ? 1 : 2));
const canSubmit = computed(() => !props.disabled && !props.readOnly && !props.busy && !props.submitDisabled
  && (props.modelValue.trim().length > 0 || props.hasContent));
const context = computed<QuireKitChatComposerContext>(() => ({
  value: props.modelValue, label: label.value, busy: props.busy, disabled: props.disabled,
  readOnly: props.readOnly, canSubmit: canSubmit.value, updateValue, submit, stop
}));

/** Notify the controlled draft owner.
 * @param value - Literal input text.
 */
function updateValue(value: string): void {
  if (!props.disabled && !props.readOnly) emit('update:modelValue', value);
}

/** Emit an allowed submission without taking ownership of async work or draft clearing. */
function submit(): void {
  if (canSubmit.value) emit('submit', { text: props.modelValue });
}

/** Request cancellation while preserving the editable draft. */
function stop(): void {
  if (props.busy && !props.disabled) emit('stop');
}

/** Forward default-input focus without querying a child component's DOM.
 * @param options - Native focus scrolling options.
 */
function focus(options?: FocusOptions): void { input.value?.focus(options); }
defineExpose({ focus });

/** Parts of the surface that handle their own presses and keep focus where it is. */
const INTERACTIVE = 'button, a, input, textarea, select, label, [contenteditable], [role="button"], [role="combobox"], [role="menuitem"], [tabindex]';

/** A single-row input leaves most of the surface empty; pressing that area focuses the input instead of nothing.
 * @param event - Native pointer press inside the surface.
 */
function onSurfacePointerDown(event: PointerEvent): void {
  if (event.button !== 0 || props.disabled || !(event.target instanceof Element) || event.target.closest(INTERACTIVE)) return;
  event.preventDefault();
  focus({ preventScroll: true });
}

/** Detect files without taking ownership of validation or reading their contents.
 * @param transfer - Clipboard or drag transfer.
 * @returns Whether the gesture contains or advertises files.
 */
function hasTransferFiles(transfer: DataTransfer | null): boolean {
  return !!transfer && (transfer.files.length > 0 || Array.from(transfer.items).some(item => item.kind === 'file')
    || Array.from(transfer.types).includes('Files'));
}

/** Leave ordinary text paste native; delegate file paste to the configured owner.
 * @param event - Native paste event bubbling from the input.
 */
function onPaste(event: ClipboardEvent): void {
  const transfer = event.clipboardData;
  if (event.defaultPrevented || props.disabled || props.readOnly || !props.addTransferFiles || !transfer || !hasTransferFiles(transfer)) return;
  if (props.addTransferFiles(transfer)) event.preventDefault();
}

/** Advertise a file drop only while the Composer can accept it.
 * @param event - Native drag-over event.
 */
function onDragOver(event: DragEvent): void {
  if (event.defaultPrevented || props.disabled || props.readOnly || !props.addTransferFiles || !hasTransferFiles(event.dataTransfer)) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  fileDragging.value = true;
}

/** Ignore transitions between Composer descendants.
 * @param event - Native drag-leave event.
 */
function onDragLeave(event: DragEvent): void {
  const root = event.currentTarget;
  if (root instanceof Node && event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
  fileDragging.value = false;
}

/** Forward dropped files to the same owner used by the native chooser.
 * @param event - Native drop event.
 */
function onDrop(event: DragEvent): void {
  fileDragging.value = false;
  const transfer = event.dataTransfer;
  if (event.defaultPrevented || props.disabled || props.readOnly || !props.addTransferFiles || !transfer || !hasTransferFiles(transfer)) return;
  event.preventDefault();
  event.stopPropagation();
  props.addTransferFiles(transfer);
}

watch([() => props.disabled, () => props.readOnly, () => props.addTransferFiles], () => {
  if (props.disabled || props.readOnly || !props.addTransferFiles) fileDragging.value = false;
});
</script>

<template>
  <LocaleScope v-slot="{ dir }">
  <div v-bind="$attrs" class="qk-chat-composer" role="group" :aria-label="label" :dir="dir" :data-layout="layout"
    :data-variant="variant" :data-density="density" :data-disabled="disabled || undefined" :data-readonly="readOnly || undefined"
    :data-file-dragging="fileDragging || undefined" @paste="onPaste" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
    <div class="qk-chat-composer__surface" @pointerdown="onSurfacePointerDown">
      <div v-if="$slots.header" class="qk-chat-composer__header"><slot name="header" v-bind="context" /></div>
      <div class="qk-chat-composer__editor">
        <div v-if="$slots.leading" class="qk-chat-composer__leading"><slot name="leading" v-bind="context" /></div>
        <div class="qk-chat-composer__input">
          <slot name="input" v-bind="context">
            <ComposerInput ref="input" :model-value="modelValue" :label="label" :placeholder="placeholder ?? text.composer.placeholder" :size="size" variant="embedded"
              :aria-describedby="$slots.footer ? footerId : undefined" :submit-mode="submitMode" :disabled="disabled" :read-only="readOnly"
              :rows="minRows" :max-rows="maxRows" @update:model-value="updateValue" @submit="submit" />
          </slot>
        </div>
      </div>
      <div class="qk-chat-composer__bar">
        <div v-if="$slots.tools" class="qk-chat-composer__tools"><slot name="tools" v-bind="context" /></div>
        <div class="qk-chat-composer__trailing">
          <div v-if="$slots.actions" class="qk-chat-composer__actions"><slot name="actions" v-bind="context" /></div>
          <div class="qk-chat-composer__submit">
            <slot name="submit" v-bind="context">
              <ComposerSubmit :busy="busy" :disabled="disabled" :can-submit="canSubmit" :appearance="submitAppearance"
                :color="submitColor" :size="layout === 'inline' || density === 'compact' ? 'sm' : 'md'" @submit="submit" @stop="stop" />
            </slot>
          </div>
        </div>
      </div>
    </div>
    <div v-if="$slots.footer" :id="footerId" class="qk-chat-composer__footer"><slot name="footer" v-bind="context" /></div>
  </div>
  </LocaleScope>
</template>
