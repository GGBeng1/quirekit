<script setup lang="ts">
import QuireTypography from "../typography/typography.vue";
import { computed, useId } from "vue";
import type { QuireKitAlertColor, QuireKitAlertRole, QuireKitAlertVariant } from "../../components/alert";
import QuireIcon from "../icon/icon.vue";
import QuireIconButton from "../button/icon-button.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** 页面内提示的公开属性。 */
interface Props {
  /** 提示标题，也可通过 title 插槽提供。 */
  readonly title?: string;
  /** 标题下方的补充说明。 */
  readonly description?: string;
  /** 提示的语义色族。 */
  readonly color?: QuireKitAlertColor;
  /** 背景与边框外观。 */
  readonly variant?: QuireKitAlertVariant;
  /** 已注册的图标名；false 隐藏图标，省略时按色族选择。 */
  readonly icon?: string | false | undefined;
  /** 显示图标关闭按钮。 */
  readonly closable?: boolean;
  /** group 用于静态内容；status 温和播报更新，alert 播报紧急更新。 */
  readonly role?: QuireKitAlertRole;
}

/** Alert 的可组合内容。 */
interface Slots {
  /** 替换默认装饰图标。 */
  readonly icon?: () => unknown;
  /** 替换标题内容。 */
  readonly title?: () => unknown;
  /** 替换说明内容，可包含链接。 */
  readonly description?: () => unknown;
  /** 补充列表或其他正文内容。 */
  readonly default?: () => unknown;
  /** 操作按钮与链接区域。 */
  readonly actions?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined, color: "info", variant: "subtle", closable: false, role: "group"
});
/** 控制提示是否显示，支持 v-model:open。 */
const open = defineModel<boolean>("open", { default: true });
const emit = defineEmits<{
  /** 用户激活关闭按钮时触发。 */
  close: [];
}>();
defineSlots<Slots>();
const text = useQuireKitMessages("alert");
const titleId = `qk-alert-${useId()}-title`;
const iconName = computed(() => props.icon === false ? undefined : props.icon ?? ({
  neutral: "circleInfo", primary: "circleInfo", info: "circleInfo",
  success: "circleCheck", warning: "triangleAlert", danger: "circleX"
}[props.color]));

/** 关闭当前提示并通知调用方。 */
function dismiss(): void {
  open.value = false;
  emit("close");
}
</script>

<template>
  <div
    v-if="open"
    :role="role"
    :aria-labelledby="title || $slots.title ? titleId : undefined"
    :class="['qk-alert', `qk-alert--${color}`, `qk-alert--${variant}`]"
  >
    <span v-if="$slots.icon || iconName" class="qk-alert__icon" aria-hidden="true">
      <slot name="icon"><QuireIcon :name="iconName" :size="20" /></slot>
    </span>
    <div class="qk-alert__body">
      <QuireTypography as="div" variant="control" v-if="title || $slots.title" :id="titleId" class="qk-alert__title"><slot name="title">{{ title }}</slot></QuireTypography>
      <QuireTypography as="div" variant="body" v-if="description || $slots.description" class="qk-alert__description"><slot name="description">{{ description }}</slot></QuireTypography>
      <div v-if="$slots.default" class="qk-alert__content"><slot /></div>
      <div v-if="$slots.actions" class="qk-alert__actions"><slot name="actions" /></div>
    </div>
    <QuireIconButton v-if="closable" :label="text.close" class="qk-alert__close" @click="dismiss">
      <QuireIcon name="close" :size="16" />
    </QuireIconButton>
  </div>
</template>
