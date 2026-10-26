<script setup lang="ts">
import { ark } from "@ark-ui/vue/factory";
import type { ButtonHTMLAttributes } from "vue";
import type {
  QuireKitButtonColor,
  QuireKitButtonSize,
  QuireKitButtonVariant
} from "../../components/button";

const ArkButton = ark.button;

/** Vue Button 适配器的公开属性。 */
interface Props {
  /** 原生 button 的提交行为。 */
  readonly type?: ButtonHTMLAttributes["type"];
  /** 同步约束高度、排版、间距、圆角与图标盒的公开尺寸。 */
  readonly size?: QuireKitButtonSize;
  /** 通过主题注册的语义色族表达动作角色。 */
  readonly color?: QuireKitButtonColor;
  /** 与语义色正交的填充、边界和文字外观。 */
  readonly variant?: QuireKitButtonVariant;
  /** 是否占满所在容器的可用行内宽度。 */
  readonly block?: boolean;
  /** 是否阻止激活并暴露原生 disabled 语义。 */
  readonly disabled?: boolean;
  /** 是否处于处理中；保留标签并以 spinner 替换 leading。 */
  readonly busy?: boolean;
}

/** Vue Button 的稳定三段内容结构。 */
interface Slots {
  /** 描述动作的按钮标签。 */
  readonly default: () => unknown;
  /** 标签前的图标或稳定状态标记。 */
  readonly leading?: () => unknown;
  /** 标签后的快捷键提示或 disclosure。 */
  readonly trailing?: () => unknown;
}

const {
  type = "button",
  size = "sm",
  color = "neutral",
  variant = "ghost",
  block = false,
  disabled = false,
  busy = false
} = defineProps<Props>();

defineSlots<Slots>();
</script>

<template>
  <component
    :is="ArkButton"
    :type="type"
    data-scope="button"
    data-part="root"
    :class="[
      'qk-button',
      `qk-button--${color}-${variant}`,
      `qk-button--${size}`,
      variant === 'link' && 'qk-button--link',
      block && 'qk-button--block'
    ]"
    :disabled="disabled || busy"
    :aria-busy="busy || undefined"
    :data-state="busy ? 'busy' : undefined"
  >
    <span
      v-if="busy || $slots.leading"
      :class="['qk-button__icon', `qk-button__icon--${size}`]"
      aria-hidden="true"
      data-slot="leading"
    >
      <svg
        v-if="busy"
        class="qk-button__spinner"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M20 12a8 8 0 0 1-8 8" />
        <path d="M4 12a8 8 0 0 1 8-8" opacity=".35" />
      </svg>
      <slot v-else name="leading" />
    </span>
    <span class="qk-button__label" data-slot="label"><slot /></span>
    <span
      v-if="$slots.trailing"
      :class="['qk-button__trailing', `qk-button__trailing--${size}`]"
      aria-hidden="true"
      data-slot="trailing"
    >
      <slot name="trailing" />
    </span>
  </component>
</template>
