<script setup lang="ts">
import { Clipboard } from "@ark-ui/vue/clipboard";
import { useId } from "vue";
import type { QuireKitClipboardMode, QuireKitClipboardStatusDetails, QuireKitClipboardSlotProps, QuireKitClipboardControlSlotProps, QuireKitClipboardErrorDetails } from "../../components/clipboard";
import type { QuireKitControlSize } from "../../components/control";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { useCopyFeedback } from "./use-copy-feedback";

/** Clipboard 公开属性。 */
interface Props {
  /** 当前待复制的纯文本。 */
  readonly value: string;
  /** Read expensive source only for an explicit copy; value remains the displayed value and feedback identity. */
  readonly getValue?: (() => string) | undefined;
  /** 可见字段名称；同时用于复制按钮的可访问名称。 */
  readonly label?: string;
  /** 只用于复制按钮可访问名称的内容名称，如“代码”，不显示在界面上；省略时沿用 label。 */
  readonly target?: string;
  /** input 提供可选择的只读输入，text 展示文本，icon 只展示复制按钮。 */
  readonly mode?: QuireKitClipboardMode;
  /** 复制按钮外观；text 用于代码标题栏等轻量操作，默认 outline。 */
  readonly variant?: "outline" | "text";
  /** 输入框与按钮共用的尺寸档位，默认 sm；行内操作可用 xs。 */
  readonly size?: QuireKitControlSize;
  /** 复制反馈的持续时间，单位毫秒。 */
  readonly timeout?: number;
  /** 是否禁用复制操作。 */
  readonly disabled?: boolean;
}

/** Clipboard 的可替换内容。 */
interface Slots {
  /** 自定义待复制内容的呈现。 */
  readonly content?: (props: QuireKitClipboardSlotProps) => unknown;
  /** 自定义现有复制按钮内部的图标和文案。 */
  readonly trigger?: (props: QuireKitClipboardSlotProps) => unknown;
  /** 替换完整控件；必须接入 copy、disabled 和 describedBy，不能再嵌套按钮。 */
  readonly control?: (props: QuireKitClipboardControlSlotProps) => unknown;
}

/** Clipboard 语义事件。 */
interface Emits {
  /** 系统剪贴板完成写入时触发；超时后的状态从插槽 copied 读取。 */
  statusChange: [details: QuireKitClipboardStatusDetails];
  /** 写入失败时触发，复制按钮恢复后可以重试。 */
  copyError: [details: QuireKitClipboardErrorDetails];
}

const props = withDefaults(defineProps<Props>(), {
  mode: "input", size: "sm", variant: "outline", timeout: 2000, disabled: false
});
const text = useQuireKitMessages("clipboard");
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const inputId = `qk-clipboard-${useId()}-input`;
const feedbackId = `${inputId}-feedback`;
const { copied, copying, error, copy } = useCopyFeedback(
  () => props.value, () => props.timeout,
  () => emit("statusChange", { copied: true }),
  details => emit("copyError", details), () => props.getValue?.() ?? props.value
);

/**
 * Preserves the readonly input's select-on-focus behavior.
 * @param event - Native focus event from the clipboard input.
 */
function selectInput(event: FocusEvent): void {
  (event.target as HTMLInputElement).select();
}

/** Starts a copy only when the public disabled state allows it. */
function requestCopy(): void {
  if (!props.disabled && (props.getValue || props.value.length > 0) && !copying.value) void copy();
}
</script>

<template>
  <Clipboard.Root
    :model-value="value" :ids="{ input: inputId }" :class="['qk-clipboard', `qk-clipboard--${size}`]"
    :data-copied="copied ? '' : undefined" :aria-busy="copying || undefined"
  >
    <Clipboard.Label v-if="label && mode === 'input' && !$slots.content" class="qk-clipboard__label">{{ label }}</Clipboard.Label>
    <span v-else-if="label" class="qk-clipboard__label">{{ label }}</span>
    <Clipboard.Control class="qk-clipboard__control">
      <slot v-if="mode !== 'icon'" name="content" :value="value" :copied="copied" :copying="copying" :error="error">
        <input v-if="mode === 'input'" :id="inputId" :value="value" readonly class="qk-clipboard__input" :aria-label="label ?? text.content" @focus="selectInput" />
        <Clipboard.ValueText v-else class="qk-clipboard__text" />
      </slot>
      <slot name="control" :value="value" :copied="copied" :copying="copying" :error="error"
        :disabled="disabled || (!getValue && value.length === 0)" :described-by="error ? feedbackId : undefined" :copy="requestCopy">
      <button
        type="button" :aria-label="copied ? text.copiedTarget(target ?? label) : text.copyTarget(target ?? label)"
        :aria-describedby="error ? feedbackId : undefined" :data-copied="copied ? '' : undefined"
        class="qk-clipboard__trigger" :data-variant="variant" :data-icon-only="mode === 'icon' ? '' : undefined"
        :aria-disabled="copying || undefined" :disabled="disabled || (!getValue && value.length === 0)" @click="requestCopy"
      >
        <slot name="trigger" :value="value" :copied="copied" :copying="copying" :error="error">
          <QuireIcon :name="copied ? 'check' : 'copy'" :size="size === 'xl' ? 20 : 16" />
          <span v-if="mode !== 'icon'" class="qk-clipboard__labels" aria-hidden="true">
            <span :data-hidden="copied ? '' : undefined">{{ text.copy }}</span>
            <span :data-hidden="copied ? undefined : ''">{{ text.copied }}</span>
          </span>
        </slot>
      </button>
      </slot>
    </Clipboard.Control>
    <span :id="feedbackId" :class="error ? 'qk-clipboard__error' : 'sr-only'" role="status" aria-live="polite">{{ error ? text.error : copied ? text.copied : '' }}</span>
  </Clipboard.Root>
</template>
