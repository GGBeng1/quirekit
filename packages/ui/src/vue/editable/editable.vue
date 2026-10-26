<script setup lang="ts">
import { Editable } from "@ark-ui/vue/editable";
import { computed, useId } from "vue";
import type { QuireKitEditableActivationMode, QuireKitEditableSubmitMode, QuireKitEditableValueDetails, QuireKitEditableEditDetails, QuireKitEditableSlotProps } from "../../components/editable";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** 就地编辑的公开属性。 */
interface Props {
  /** 可见的字段名称。 */
  readonly label: string;
  /** 是否仅在视觉上隐藏字段名称，同时保留可访问名称。 */
  readonly hideLabel?: boolean;
  /** 未受控初始文本。 */
  readonly defaultValue?: string;
  /** 预览与输入的空值提示；省略时使用语言包的通用提示。 */
  readonly placeholder?: string;
  /** 操作说明。 */
  readonly description?: string;
  /** 宿主校验的恢复说明；省略时使用语言包的通用提示。 */
  readonly errorText?: string;
  /** 预览内容如何进入编辑模式。 */
  readonly activationMode?: QuireKitEditableActivationMode;
  /** Enter、失焦或仅按钮提交。 */
  readonly submitMode?: QuireKitEditableSubmitMode;
  /** 是否根据内容自动调整输入宽度。 */
  readonly autoResize?: boolean;
  /** 初始是否处于编辑模式。 */
  readonly defaultEdit?: boolean;
  /** 聚焦时是否选中全部文本。 */
  readonly selectOnFocus?: boolean;
  /** 是否显示默认编辑、提交和取消按钮。 */
  readonly controls?: boolean;
  /** 最多输入的字符数。 */
  readonly maxLength?: number;
  /** 原生表单字段名。 */
  readonly name?: string;
  /** 外部表单 id。 */
  readonly form?: string;
  /** 是否禁用交互。 */
  readonly disabled?: boolean;
  /** 是否只读。 */
  readonly readOnly?: boolean;
  /** 是否必填。 */
  readonly required?: boolean;
  /** 宿主校验状态；不自动拦截提交。 */
  readonly invalid?: boolean;
}

/** 就地编辑的内容位置。 */
interface Slots {
  /** 自定义预览内容，保留进入编辑和焦点操作。 */
  readonly preview?: (props: QuireKitEditableSlotProps) => unknown;
  /** 自定义编辑、提交和取消操作。 */
  readonly controls?: (props: QuireKitEditableSlotProps) => unknown;
}

/** 就地编辑的语义事件。 */
interface Emits {
  /** 每次输入变化。 */
  valueChange: [details: QuireKitEditableValueDetails];
  /** 用户提交文本；适合绑定持久化。 */
  valueCommit: [details: QuireKitEditableValueDetails];
  /** 用户取消并恢复进入编辑前的文本。 */
  valueRevert: [details: QuireKitEditableValueDetails];
  /** 编辑模式变化。 */
  editChange: [details: QuireKitEditableEditDetails];
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: "", activationMode: "click", submitMode: "both",
  autoResize: false, defaultEdit: false, selectOnFocus: true, controls: true,
  disabled: false, readOnly: false, required: false, invalid: false, hideLabel: false
});
const modelValue = defineModel<string | undefined>();
const edit = defineModel<boolean | undefined>("edit", { default: undefined });
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("editable");
const messageId = `qk-editable-${useId()}-message`;
const message = computed(() => props.invalid ? props.errorText ?? text.value.invalid : props.description);
const bindings = computed(() => ({
  ...(modelValue.value === undefined ? { defaultValue: props.defaultValue } : { modelValue: modelValue.value }),
  ...(edit.value === undefined ? { defaultEdit: props.defaultEdit } : { edit: edit.value }),
  ...(props.maxLength === undefined ? {} : { maxLength: props.maxLength }),
  ...(props.name === undefined ? {} : { name: props.name }),
  ...(props.form === undefined ? {} : { form: props.form })
}));
</script>

<template>
  <Editable.Root
    v-bind="bindings" class="qk-editable" :activation-mode="activationMode" :submit-mode="submitMode"
    :auto-resize="autoResize" :select-on-focus="selectOnFocus" :placeholder="placeholder ?? text.placeholder"
    :disabled="disabled" :read-only="readOnly" :required="required" :invalid="invalid"
    :translations="{ edit: text.edit(label), submit: text.submit(label), cancel: text.cancel(label), input: label }"
    @update:model-value="modelValue = $event" @update:edit="edit = $event"
    @value-change="emit('valueChange', $event)" @value-commit="emit('valueCommit', $event)"
    @value-revert="emit('valueRevert', $event)" @edit-change="emit('editChange', $event)"
  >
    <Editable.Label class="qk-editable__label" :data-hidden="hideLabel ? '' : undefined">{{ label }}</Editable.Label>
    <Editable.Context v-slot="editable">
      <div class="qk-editable__row">
        <Editable.Area class="qk-editable__area" :data-autoresize="autoResize ? '' : undefined">
          <!-- Vue owns slot children; override Zag's innerHTML projection to avoid replacing their DOM. -->
          <Editable.Preview class="qk-editable__preview" v-bind="{ innerHTML: undefined }" :aria-describedby="message ? messageId : undefined">
            <slot name="preview" v-bind="editable">{{ editable.valueText }}</slot>
          </Editable.Preview>
          <Editable.Input class="qk-editable__input" :aria-describedby="message ? messageId : undefined" />
        </Editable.Area>
        <Editable.Control v-if="controls && !readOnly" class="qk-editable__controls" :data-default="$slots.controls ? undefined : ''">
          <slot name="controls" v-bind="editable">
            <template v-if="editable.editing">
              <Editable.SubmitTrigger class="qk-editable__action"><QuireIcon name="check" :size="16" /></Editable.SubmitTrigger>
              <Editable.CancelTrigger class="qk-editable__action"><QuireIcon name="close" :size="16" /></Editable.CancelTrigger>
            </template>
            <Editable.EditTrigger v-else class="qk-editable__action"><QuireIcon name="edit" :size="16" /></Editable.EditTrigger>
          </slot>
        </Editable.Control>
      </div>
    </Editable.Context>
    <p v-if="message" :id="messageId" class="qk-editable__message" :data-invalid="invalid ? '' : undefined" :role="invalid ? 'alert' : undefined">{{ message }}</p>
  </Editable.Root>
</template>
