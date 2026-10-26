<script setup lang="ts">
import QuireThemePortal from "../theme-provider/portal.vue";
import { useAttrs, type StyleValue } from "vue";
import { Dialog, useDialogContext } from "@ark-ui/vue/dialog";
import type { QuireKitDialogSize } from "../../components/dialog/types";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** Dialog 固定结构和任务规模的公开属性。 */
interface Props {
  /** Native content container; form preserves Enter submission and footer submit buttons. */
  readonly as?: "div" | "form";
  /** 可访问且始终可见的任务标题。 */
  readonly title: string;
  /** 标题下的必要任务说明。 */
  readonly description?: string;
  /** small、medium、large 三档任务规模。 */
  readonly size?: QuireKitDialogSize;
  /** Portal 目标元素或选择器。 */
  readonly portalTarget?: string | HTMLElement;
  /** 是否把模态层传送到 Portal 目标。 */
  readonly portalled?: boolean;
  /** 是否显示覆盖页面的背景遮罩。 */
  readonly showBackdrop?: boolean;
  /** 是否显示标题区关闭按钮。 */
  readonly showClose?: boolean;
  /** 是否正在处理任务；输入与按钮的可用状态需单独设置。 */
  readonly busy?: boolean;
  /** footer 上方的任务级错误。 */
  readonly errorText?: string;
}

/** Dialog Content 的固定内容区域。 */
interface Slots {
  /** 独立滚动的任务正文。 */
  readonly default: () => unknown;
  /** 标题区右侧的附加动作。 */
  readonly headerActions?: () => unknown;
  /** 任务状态或恢复反馈；错误内容须同时设置 errorText。 */
  readonly status?: () => unknown;
  /** 固定在正文下方的任务操作。 */
  readonly footer?: () => unknown;
}

withDefaults(defineProps<Props>(), {
  as: "div",
  size: "medium",
  portalTarget: "body",
  portalled: true,
  showBackdrop: true,
  showClose: true,
  busy: false
});
defineSlots<Slots>();
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const text = useQuireKitMessages("dialog");
// Presence may retain exit frames; only the open layer may consume interaction.
const dialog = useDialogContext();
</script>

<template>
  <Teleport :to="portalTarget" :disabled="!portalled">
    <QuireThemePortal>
      <Dialog.Backdrop :style="attrs.style as StyleValue" v-if="showBackdrop" :inert="!dialog.open || undefined" class="qk-dialog__backdrop" />
      <Dialog.Positioner :style="attrs.style as StyleValue" :inert="!dialog.open || undefined" class="qk-dialog__positioner">
        <Dialog.Content as-child
          v-bind="attrs"
          :class="['qk-dialog__content', `qk-dialog__content--${size}`, busy && 'qk-dialog__content--busy']"
          :aria-busy="busy || undefined"
        >
          <component :is="as">
          <header class="qk-dialog__header">
            <span class="qk-dialog__heading">
              <Dialog.Title class="qk-dialog__title">{{ title }}</Dialog.Title>
              <Dialog.Description v-if="description" class="qk-dialog__description">
                {{ description }}
              </Dialog.Description>
            </span>
            <span v-if="$slots.headerActions || showClose" class="qk-dialog__header-actions">
              <slot name="headerActions" />
              <Dialog.CloseTrigger v-if="showClose" :aria-label="text.close" class="qk-dialog__close-trigger">
                <QuireIcon name="close" :size="16" />
              </Dialog.CloseTrigger>
            </span>
          </header>

          <div class="qk-dialog__body"><slot /></div>

          <div v-if="errorText || $slots.status" class="qk-dialog__status" :role="errorText ? 'alert' : 'status'">
            <slot name="status">{{ errorText }}</slot>
          </div>
          <footer v-if="$slots.footer" class="qk-dialog__footer"><slot name="footer" /></footer>
          </component>
        </Dialog.Content>
      </Dialog.Positioner>
    </QuireThemePortal>
  </Teleport>
</template>
