<script setup lang="ts">
import { Toast, Toaster, type ToastOptions } from "@ark-ui/vue/toast";
import type {
  QuireKitToastAppearance,
  QuireKitToastType
} from "../../components/toast";
import QuireIcon from "../icon/icon.vue";
import type { QuireKitToaster } from "./create-toaster";
import { useQuireKitMessages } from "../locale-provider/context";

/** Vue Toast 视口的公开属性。 */
interface Props {
  /** 由 createQuireKitToaster 创建的通知实例。 */
  readonly toaster: QuireKitToaster;
  /** 是否显示与状态匹配的默认图标。 */
  readonly showIcon?: boolean;
  /** Toast 的视觉外观；accent 增加轻底色图标容器与前导状态强调。 */
  readonly appearance?: QuireKitToastAppearance;
}

/** Toast 允许替换的局部内容。 */
interface Slots {
  /** 替换默认状态图标，同时保留其布局与语义位置。 */
  readonly icon?: (props: {
    /** 当前 Toast 的创建参数。 */
    readonly toast: ToastOptions;
    /** 当前状态对应的默认图标名。 */
    readonly iconName: ToastIconName;
  }) => unknown;
}

/** Toast 内建状态对应的已注册图标名。 */
type ToastIconName = "circleInfo" | "circleCheck" | "triangleAlert" | "circleX" | "loaderCircle";

withDefaults(defineProps<Props>(), {
  showIcon: true,
  appearance: "outline"
});
defineSlots<Slots>();
const text = useQuireKitMessages("toast");

/**
 * 将 Ark Toast 状态映射到 QuireKit 已审核图标。
 *
 * @param type - Toast 当前状态类型。
 * @returns 对应的稳定图标注册名。
 */
function getIconName(type: string | undefined): ToastIconName {
  if (type === "success") return "circleCheck";
  if (type === "warning") return "triangleAlert";
  if (type === "error") return "circleX";
  if (type === "loading") return "loaderCircle";
  return "circleInfo";
}

/**
 * 将开放字符串类型收窄到 QuireKit 的内建视觉状态。
 *
 * @param type - Ark 允许扩展的 Toast 类型。
 * @returns 可用于稳定 class 的内建状态。
 */
function getVisualType(type: string | undefined): QuireKitToastType {
  if (type === "success" || type === "warning" || type === "error" || type === "loading") {
    return type;
  }
  return "info";
}
</script>

<template>
  <Toaster :toaster="toaster" class="qk-toast__group">
    <template #default="toast">
      <Toast.Root
        :class="[
          'qk-toast',
          `qk-toast--${getVisualType(toast.type)}`,
          `qk-toast--appearance-${appearance}`
        ]"
      >
        <span v-if="showIcon" class="qk-toast__icon" aria-hidden="true">
          <slot name="icon" :toast="toast" :icon-name="getIconName(toast.type)">
            <QuireIcon
              :name="getIconName(toast.type)"
              :class="{ 'qk-toast__spinner': toast.type === 'loading' }"
              :size="20"
            />
          </slot>
        </span>

        <span class="qk-toast__body">
          <Toast.Title v-if="toast.title" class="qk-toast__title">
            {{ toast.title }}
          </Toast.Title>
          <Toast.Description v-if="toast.description" class="qk-toast__description">
            {{ toast.description }}
          </Toast.Description>
        </span>

        <Toast.ActionTrigger
          v-if="toast.action"
          class="qk-toast__action qk-button qk-button--neutral-ghost qk-button--sm"
        >
          {{ toast.action.label }}
        </Toast.ActionTrigger>

        <Toast.CloseTrigger
          v-if="toast.closable"
          :aria-label="text.close"
          class="qk-toast__close-trigger"
        >
          <QuireIcon name="close" :size="16" />
        </Toast.CloseTrigger>
      </Toast.Root>
    </template>
  </Toaster>
</template>
