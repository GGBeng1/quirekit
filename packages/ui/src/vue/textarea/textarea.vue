<script setup lang="ts">
import { ark } from "@ark-ui/vue/factory";
import { computed, ref, useAttrs, watch } from "vue";
import { useTextareaAutoResize } from "./auto-resize";
import { useFieldLabel } from "../field/context";
import { useQuireKitMessages } from "../locale-provider/context";
import type {
  QuireKitTextareaResize,
  QuireKitTextareaSize,
  QuireKitTextareaVariant
} from "../../components/textarea";

defineOptions({ inheritAttrs: false });

const ArkTextarea = ark.textarea;

/** 多行 Textarea 的公开属性。 */
interface Props {
  /** 受控文本值。 */
  readonly modelValue?: string;
  /** 非受控模式的初始文本值。 */
  readonly defaultValue?: string;
  /** 控件的排版尺寸。 */
  readonly size?: QuireKitTextareaSize;
  /** embedded 用于已有输入表面的复合控件；宿主必须提供焦点、错误和禁用反馈。 */
  readonly variant?: QuireKitTextareaVariant;
  /** 控件的 CSS 宽度。 */
  readonly width?: string | number;
  /** 初始可见文本行数。 */
  readonly rows?: number;
  /** 是否随内容增高；启用时 rows 表达最小行数。 */
  readonly autoResize?: boolean;
  /** 自动增高的最大行数；超过后在输入框内滚动。 */
  readonly maxRows?: number;
  /** 用户可拖动改变尺寸的方向；none 隐藏右下角拖拽角标。 */
  readonly resize?: QuireKitTextareaResize;
  /** 空值提示；省略时按字段标签生成本地化提示，空字符串关闭提示。 */
  readonly placeholder?: string | undefined;
  /** 原生字段名。 */
  readonly name?: string;
  /** 关联的 form id。 */
  readonly form?: string;
  /** 浏览器自动完成提示。 */
  readonly autocomplete?: string;
  /** 文本换行提交策略。 */
  readonly wrap?: "hard" | "soft";
  /** 是否禁用输入。 */
  readonly disabled?: boolean;
  /** 是否显示错误状态。 */
  readonly invalid?: boolean;
  /** 是否要求表单提交一个值。 */
  readonly required?: boolean;
  /** 是否允许聚焦但禁止修改。 */
  readonly readOnly?: boolean;
  /** 最少允许的字符数。 */
  readonly minlength?: number;
  /** 最多允许的字符数。 */
  readonly maxlength?: number;
  /** 是否在右下角显示字符计数。 */
  readonly showCount?: boolean;
}

/** Textarea 的公开事件。 */
interface Emits {
  /** 同步受控文本值。 */
  "update:modelValue": [value: string];
  /** 输入过程中同步最新文本值。 */
  valueChange: [value: string];
  /** 原生 change 边界提交的文本值。 */
  change: [value: string];
  /** 输入获得焦点。 */
  focus: [event: FocusEvent];
  /** 输入失去焦点。 */
  blur: [event: FocusEvent];
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: "",
  size: "sm",
  variant: "outline",
  width: "320px",
  rows: 4,
  autoResize: false,
  resize: "none",
  disabled: false,
  invalid: false,
  required: false,
  readOnly: false,
  showCount: false
});
const emit = defineEmits<Emits>();
const attrs = useAttrs();
const text = useQuireKitMessages("input");
const fieldLabel = useFieldLabel();
const emptyHint = computed(() => {
  const label = typeof attrs["aria-label"] === "string" ? attrs["aria-label"] : fieldLabel.value;
  return props.placeholder ?? (label ? text.value.fieldPlaceholder(label) : text.value.placeholder.text);
});
const root = ref<HTMLElement>();
const internalValue = ref(props.modelValue ?? props.defaultValue);
const currentValue = computed(() => props.modelValue ?? internalValue.value);
useTextareaAutoResize(root, () => currentValue.value,
  () => ({ enabled: props.autoResize, rows: props.rows, maxRows: props.maxRows }),
  () => [props.size, props.showCount]);
const countLabel = computed(() => props.maxlength === undefined
  ? `${currentValue.value.length}`
  : `${currentValue.value.length}/${props.maxlength}`);
const rootStyle = computed(() => [
  { width: props.width },
  attrs.style
]);
const rootClass = computed(() => attrs.class);
const textareaAttrs = computed(() => Object.fromEntries(
  Object.entries(attrs).filter(([name]) => name !== "class" && name !== "style")
));

watch(() => props.modelValue, (value) => {
  if (value !== undefined) internalValue.value = value;
});

/**
 * 同步输入过程中的文本值。
 *
 * @param event - 原生 input 事件。
 */
function updateValue(event: Event): void {
  const value = (event.currentTarget as HTMLTextAreaElement).value;
  internalValue.value = value;
  emit("update:modelValue", value);
  emit("valueChange", value);
}

/**
 * 转发原生 change 边界的稳定文本值。
 *
 * @param event - 原生 change 事件。
 */
function commitValue(event: Event): void {
  emit("change", (event.currentTarget as HTMLTextAreaElement).value);
}

/** Focus the field owned by this adapter without exposing its DOM anatomy.
 * @param options - Native focus scrolling options.
 */
function focus(options?: FocusOptions): void {
  root.value?.querySelector('textarea')?.focus(options);
}
defineExpose({ focus });
</script>

<template>
  <span
    ref="root"
    :style="rootStyle"
    :class="[
      'qk-textarea',
      `qk-textarea--${size}`,
      variant === 'embedded' && 'qk-textarea--embedded',
      invalid && 'qk-textarea--invalid',
      disabled && 'qk-textarea--disabled',
      rootClass
    ]"
  >
    <component
      :is="ArkTextarea"
      v-bind="textareaAttrs"
      :value="currentValue"
      :rows="rows"
      :placeholder="emptyHint"
      :name="name"
      :form="form"
      :autocomplete="autocomplete"
      :wrap="wrap"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :required="required"
      :readonly="readOnly"
      :minlength="minlength"
      :maxlength="maxlength"
      :class="[
        'qk-textarea__field',
        `qk-textarea__field--resize-${autoResize ? 'none' : resize}`,
        showCount && 'qk-textarea__field--counted'
      ]"
      @input="updateValue"
      @change="commitValue"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <span v-if="showCount" aria-hidden="true" class="qk-textarea__count">
      {{ countLabel }}
    </span>
  </span>
</template>
