<script setup lang="ts">
import { computed, useId } from "vue";
import type {
  QuireKitInspectorSize,
  QuireKitInspectorSlotProps,
  QuireKitInspectorStatus,
  QuireKitInspectorVariant
} from "../../components/inspector";
import { useQuireKitMessages } from "../locale-provider/context";

/** 持续属性面板的公开属性。 */
interface Props {
  /** 默认可见标题与整个面板的可访问名称。 */
  readonly title: string;
  /** 标题下方的对象身份或上下文说明。 */
  readonly description?: string;
  /** 可选的稳定 region id。 */
  readonly id?: string;
  /** 面板与内部内容的密度。 */
  readonly size?: QuireKitInspectorSize;
  /** 外层边界和背景的归属；嵌入时由宿主提供。 */
  readonly variant?: QuireKitInspectorVariant;
  /** 面板的 CSS 宽度。 */
  readonly width?: string | number;
  /** 是否从布局与可访问树中移除面板。 */
  readonly hidden?: boolean;
  /** 是否正在同步属性。 */
  readonly busy?: boolean;
  /** 当前选择是否包含不同值。 */
  readonly mixed?: boolean;
  /** 当前属性集合是否不可编辑。 */
  readonly disabled?: boolean;
  /** 错误状态的恢复说明；存在时优先于其他状态。 */
  readonly errorText?: string;
  /** busy 状态的反馈文本；省略时使用语言包的通用提示。 */
  readonly busyText?: string;
  /** mixed 状态的反馈文本；省略时使用语言包的通用提示。 */
  readonly mixedText?: string;
  /** disabled 状态的原因说明。 */
  readonly disabledReason?: string;
}

/** Inspector 的固定内容位置。 */
interface Slots {
  /** 按 Section 分组的属性内容。 */
  readonly default: (props: QuireKitInspectorSlotProps) => unknown;
  /** Replaces the visible title, for example with Tabs; title still names the region. */
  readonly heading?: () => unknown;
  /** 标题右侧的操作。 */
  readonly actions?: () => unknown;
  /** 自定义顶部状态反馈；没有内置状态时也会显示。 */
  readonly status?: (props: QuireKitInspectorSlotProps) => unknown;
  /** 面板底部的持久操作。 */
  readonly footer?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  variant: "standalone",
  width: "288px",
  hidden: false,
  busy: false,
  mixed: false,
  disabled: false
});
const slots = defineSlots<Slots>();
const text = useQuireKitMessages("inspector");

const instanceId = useId();
const rootId = computed(() => props.id ?? instanceId);
const titleId = computed(() => `${rootId.value}-title`);
const descriptionId = computed(() => `${rootId.value}-description`);
const statusId = computed(() => `${rootId.value}-status`);
const rootStyle = computed(() => ({ width: typeof props.width === "number" ? `${props.width}px` : props.width }));
const status = computed<QuireKitInspectorStatus | undefined>(() => {
  if (props.errorText !== undefined) return "error";
  if (props.busy) return "busy";
  if (props.disabled && props.disabledReason !== undefined) return "disabled";
  if (props.mixed) return "mixed";
  return undefined;
});
const statusText = computed(() => {
  switch (status.value) {
    case "error": return props.errorText;
    case "busy": return props.busyText ?? text.value.busy;
    case "disabled": return props.disabledReason;
    case "mixed": return props.mixedText ?? text.value.mixed;
    default: return undefined;
  }
});
/**
 * Resolves descriptions against this render's optional status slot.
 *
 * Slots are not reactive dependencies, so this must run on each render.
 *
 * @returns IDs of the description and mounted status channel, when present.
 */
function getDescribedBy(): string | undefined {
  return [
    props.description ? descriptionId.value : undefined,
    status.value === undefined && !slots.status ? undefined : statusId.value
  ].filter(Boolean).join(" ") || undefined;
}
</script>

<template>
  <aside
    v-if="!props.hidden"
    :id="rootId"
    role="region"
    :aria-labelledby="$slots.heading ? undefined : titleId"
    :aria-label="$slots.heading ? title : undefined"
    :aria-describedby="getDescribedBy()"
    :aria-busy="props.busy || undefined"
    :style="rootStyle"
    :class="[
      'qk-inspector',
      `qk-inspector--${props.size}`,
      props.variant === 'embedded' && 'qk-inspector--embedded',
      props.disabled && 'qk-inspector--disabled'
    ]"
  >
    <header class="qk-inspector__header">
      <div class="qk-inspector__heading">
        <slot name="heading"><h2 :id="titleId" class="qk-inspector__title">{{ title }}</h2></slot>
        <p v-if="props.description" :id="descriptionId" class="qk-inspector__description">
          {{ props.description }}
        </p>
      </div>
      <span v-if="$slots.actions" class="qk-inspector__actions"><slot name="actions" /></span>
    </header>

    <div
      v-if="status || $slots.status"
      :id="statusId"
      :class="['qk-inspector__status', status && `qk-inspector__status--${status}`]"
      :role="status === 'error' ? 'alert' : 'status'"
    >
      <span v-if="status === 'busy'" aria-hidden="true" class="qk-inspector__busy-indicator" />
      <slot name="status" :status="status">{{ statusText }}</slot>
    </div>

    <div class="qk-inspector__body"><slot :status="status" /></div>
    <footer v-if="$slots.footer" class="qk-inspector__footer"><slot name="footer" /></footer>
  </aside>
</template>
