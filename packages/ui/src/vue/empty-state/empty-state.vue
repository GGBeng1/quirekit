<script setup lang="ts">
import QuireTypography from "../typography/typography.vue";
import { ark } from "@ark-ui/vue/factory";
import { computed, useId } from "vue";
import EmptyStateIllustration from "./illustration.vue";
import type {
  QuireKitEmptyStateHeadingLevel,
  QuireKitEmptyStateScene,
  QuireKitEmptyStateSize,
  QuireKitEmptyStateSlotProps
} from "../../components/empty-state";

const ArkGroup = ark.div;

/** 已确认空结果的公开展示属性。 */
interface Props {
  /** 可选的空结果标题；简短空态可只传 description。 */
  readonly title?: string;
  /** 解释空结果原因或下一步的可选说明。 */
  readonly description?: string;
  /** 可选的稳定 group id。 */
  readonly id?: string;
  /** 整组的简短辅助名称；省略时由可见标题命名。 */
  readonly label?: string;
  /** 显式标题语义；省略时使用普通段落。 */
  readonly headingLevel?: QuireKitEmptyStateHeadingLevel;
  /** 内容区或紧凑面板的展示尺寸。 */
  readonly size?: QuireKitEmptyStateSize;
  /** 选择内置占位插图的图案。 */
  readonly scene?: QuireKitEmptyStateScene;
  /** 显示内置插图；提供 illustration 插槽时优先显示插槽内容。 */
  readonly illustrated?: boolean;
}

/** EmptyState 的可替换内容位置。 */
interface Slots {
  /** 自定义装饰插图；说明和操作分别使用对应插槽。 */
  readonly illustration?: (props: QuireKitEmptyStateSlotProps) => unknown;
  /** 替换可见标题，保留辅助关联与显式选择的标题语义。 */
  readonly title?: (props: QuireKitEmptyStateSlotProps) => unknown;
  /** 替换空结果说明，保留外层 description 关联。 */
  readonly description?: (props: QuireKitEmptyStateSlotProps) => unknown;
  /** 自定义下一步操作的按钮或链接。 */
  readonly actions?: (props: QuireKitEmptyStateSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  scene: "data",
  illustrated: false
});
defineSlots<Slots>();

const instanceId = useId();
const rootId = computed(() => props.id ?? `qk-empty-state-${instanceId}`);
const titleId = computed(() => `${rootId.value}-title`);
const descriptionId = computed(() => `${rootId.value}-description`);
const headingTag = computed(() => props.headingLevel ? `h${props.headingLevel}` as const : "p");
const accessibleLabel = computed(() => props.label?.trim() || undefined);
</script>

<template>
  <component
    :is="ArkGroup"
    :id="rootId"
    role="group"
    :data-scene="scene"
    :aria-label="accessibleLabel"
    :aria-labelledby="accessibleLabel ? undefined : title || $slots.title ? titleId : description || $slots.description ? descriptionId : undefined"
    :aria-describedby="(accessibleLabel || title || $slots.title) && (description || $slots.description) ? descriptionId : undefined"
    :class="['qk-empty-state', `qk-empty-state--${size}`]"
  >
    <div v-if="$slots.illustration || illustrated" :class="['qk-empty-state__illustration', $slots.illustration ? `qk-empty-state__illustration--${size}` : `qk-empty-state__illustration--art-${size}`]" aria-hidden="true">
      <slot name="illustration" :size="size" :scene="scene">
        <EmptyStateIllustration :scene="scene" />
      </slot>
    </div>
    <div v-if="title || $slots.title || description || $slots.description" class="qk-empty-state__copy">
      <QuireTypography v-if="title || $slots.title" :as="headingTag" :id="titleId" :class="['qk-empty-state__title', `qk-empty-state__title--${size}`]">
        <slot name="title" :size="size" :scene="scene">{{ title }}</slot>
      </QuireTypography>
      <QuireTypography v-if="description || $slots.description" :id="descriptionId" :class="['qk-empty-state__description', `qk-empty-state__description--${size}`]">
        <slot name="description" :size="size" :scene="scene">{{ description }}</slot>
      </QuireTypography>
    </div>
    <div v-if="$slots.actions" class="qk-empty-state__actions">
      <slot name="actions" :size="size" :scene="scene" />
    </div>
  </component>
</template>
