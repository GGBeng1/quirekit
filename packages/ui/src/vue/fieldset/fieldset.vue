<script setup lang="ts">
import { Fieldset } from "@ark-ui/vue/fieldset";
import { computed } from "vue";
import type { QuireKitSpaceGap } from "../space/types";
import { resolveSpaceGap } from "../space/spacing";
import { useQuireKitMessages } from "../locale-provider/context";
import type {
  QuireKitFieldsetAppearance,
  QuireKitFieldsetOrientation,
  QuireKitFieldsetSlotProps
} from "../../components/fieldset";

/** Vue Fieldset 的公开属性。 */
interface Props {
  /** 分组的可见且可访问名称。 */
  readonly legend: string;
  /** 视觉隐藏标题但保留原生组名；隐藏时不渲染 legend/meta 自定义内容。 */
  readonly legendHidden?: boolean;
  /** 对整组字段的补充说明。 */
  readonly description?: string;
  /** 校验失败时显示的恢复说明；省略时使用语言包的通用提示。 */
  readonly errorText?: string;
  /** 稳定的原生 fieldset id。 */
  readonly id?: string;
  /** 内容的排列方向。 */
  readonly orientation?: QuireKitFieldsetOrientation;
  /** Semantic vertical distance between fields; defaults to compact surface spacing, matching Form. */
  readonly gap?: QuireKitSpaceGap;
  /** 分组的视觉外观。 */
  readonly appearance?: QuireKitFieldsetAppearance;
  /** Fieldset 接受的 CSS 宽度。 */
  readonly width?: string | number;
  /** 是否处于校验错误状态。 */
  readonly invalid?: boolean;
  /** 是否通过原生 fieldset 语义禁用组内表单控件。 */
  readonly disabled?: boolean;
}

/** Fieldset 的可替换内容位置。 */
interface Slots {
  /** 分组中的字段或任意自定义内容。 */
  readonly default: (props: QuireKitFieldsetSlotProps) => unknown;
  /** 替换 legend 文本但保留原生 legend 元素。 */
  readonly legend?: (props: QuireKitFieldsetSlotProps) => unknown;
  /** legend 右侧的计数、状态或局部操作。 */
  readonly meta?: (props: QuireKitFieldsetSlotProps) => unknown;
  /** 替换说明或错误文本。 */
  readonly message?: (props: QuireKitFieldsetSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  orientation: "vertical",
  gap: "surfaceCompact",
  appearance: "plain",
  legendHidden: false,
  width: "100%",
  invalid: false,
  disabled: false
});
defineSlots<Slots>();
const text = useQuireKitMessages("fieldset");

const rootStyle = computed(() => ({ width: props.width }));
const optionalRootBindings = computed(() => (
  props.id === undefined ? {} : { id: props.id }
));
const slotProps = computed<QuireKitFieldsetSlotProps>(() => ({
  invalid: props.invalid,
  disabled: props.disabled,
  orientation: props.orientation
}));
</script>

<template>
  <Fieldset.Root
    v-bind="optionalRootBindings"
    :invalid="invalid"
    :disabled="disabled"
    :style="rootStyle"
    :class="[
      'qk-fieldset',
      `qk-fieldset--${appearance}`,
      invalid && 'qk-fieldset--invalid',
      disabled && 'qk-fieldset--disabled'
    ]"
  >
    <Fieldset.Legend
      :class="[
        legendHidden ? 'qk-fieldset__legend--hidden' : 'qk-fieldset__legend'
      ]"
    >
      <template v-if="legendHidden">{{ legend }}</template>
      <span v-else class="qk-fieldset__legend-label">
        <slot name="legend" v-bind="slotProps">{{ legend }}</slot>
      </span>
      <span v-if="!legendHidden && $slots.meta" class="qk-fieldset__meta">
        <slot name="meta" v-bind="slotProps" />
      </span>
    </Fieldset.Legend>

    <div
      class="qk-fieldset__body"
    >
      <Fieldset.HelperText
        v-if="description && !invalid"
        class="qk-fieldset__message"
      >
        <slot name="message" v-bind="slotProps">{{ description }}</slot>
      </Fieldset.HelperText>
      <Fieldset.ErrorText
        v-if="invalid"
        class="qk-fieldset__message qk-fieldset__message--error"
      >
        <slot name="message" v-bind="slotProps">{{ errorText ?? text.invalid }}</slot>
      </Fieldset.ErrorText>

      <div
        :style="{ rowGap: resolveSpaceGap(gap), alignItems: 'start' }"
        :class="[
          'qk-fieldset__content',
          `qk-fieldset__content--${orientation}`
        ]"
      >
        <slot v-bind="slotProps" />
      </div>
    </div>
  </Fieldset.Root>
</template>
