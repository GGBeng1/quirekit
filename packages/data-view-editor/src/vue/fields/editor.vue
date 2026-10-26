<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { ref, useId } from "vue";
import { QuireButton, QuireIconButton, QuireIcon, QuireInput, QuireSelect, QuireField, QuireTag, QuireTaskPanel } from "@quirekit/ui/vue";
import type { DataField, DataOperation, DataOptionColor } from "@quirekit/data-view";
import { optionColor, optionColors } from "../shared/presentation";
import type { FieldEditorProps } from "./types";
const props = defineProps<FieldEditorProps>();
const emit = defineEmits<{apply: [operations: readonly DataOperation[]]; close: []; released: []}>();
const formId = `field-form-${useId()}`, nameError = ref("");
const name = ref(props.field?.name ?? ""), type = ref<DataField["type"]>(props.field?.type ?? "text");
const options = ref(props.field && "options" in props.field ? props.field.options.map(option => ({...option})) : []);
const types = [{value: "text", label: "文本"}, {value: "number", label: "数字"}, {value: "boolean", label: "布尔值"}, {value: "date", label: "日期"}, {value: "datetime", label: "时间（含时区）"}, {value: "singleSelect", label: "单选"}, {value: "multiSelect", label: "多选"}];
/** Adds an option with identity independent of its label. */
function addOption(): void { options.value.push({id: uuidv4(), label: "新选项"}); }
/** @param element - Public shell mount notification; only a completed exit releases the source. */
function contentChanged(element: HTMLElement | null): void { if (!element && !props.open) emit("released"); }
/** Proposes a schema without implicit conversion or data deletion. */
function save(): void {
  if (props.busy) return;
  nameError.value = name.value.trim() ? "" : "请输入字段名称。";
  if (nameError.value) return;
  const base = {...props.field, id: props.field?.id ?? uuidv4(), name: name.value.trim()};
  // Carry extension metadata but remove the old choice-only property on type change.
  const {options: _previousOptions, ...common} = {...base, options: undefined};
  const field: DataField = type.value === "singleSelect" || type.value === "multiSelect" ? {...common, type: type.value, options: options.value} : {...common, type: type.value};
  emit("apply", props.field ? [{type: "replace-field", field}] : [{type: "add-field", field, defaultValue: null}]);
}
</script>
<template>
  <QuireTaskPanel :open="open" :title="field ? '编辑字段' : '添加字段'" :anchor-el="anchorEl" :final-focus-el="finalFocusEl" :busy="busy" :width="360" max-height="min(76dvh, 640px)" @update:open="!$event && emit('close')" @content-element-change="contentChanged">
    <form :id="formId" class="dv-fields" @submit.prevent="save">
      <QuireField label="字段名称" required width="100%" :invalid="!!nameError" :error-text="nameError"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="name" placeholder="例如：负责人、截止日期" width="100%" :read-only="busy" :maxlength="100" @update:model-value="nameError = ''" /></template></QuireField>
      <QuireField label="字段类型" width="100%"><QuireSelect :model-value="type" :items="types" label="字段类型" width="100%" :layer-offset="1" :disabled="busy || field?.id === data.primaryFieldId" @value-change="$event && (type = $event as DataField['type'])" /></QuireField>
      <div v-if="type === 'singleSelect' || type === 'multiSelect'" class="dv-options">
        <div v-for="(option, index) in options" :key="option.id" class="dv-option">
          <QuireInput v-model="option.label" :aria-label="`选项 ${index + 1}`" placeholder="例如：待办、进行中" width="100%" required :read-only="busy" />
          <QuireIconButton :label="`删除选项 ${index + 1}`" variant="outline" :disabled="busy" @click="options.splice(index, 1)"><QuireIcon name="trash" /></QuireIconButton>
          <div class="dv-option-meta"><QuireSelect :label="`选项 ${index + 1} 颜色`" :model-value="optionColor(option)" :items="optionColors" width="110px" :layer-offset="1" :disabled="busy" @value-change="$event && (option.color = $event as DataOptionColor)" /><QuireTag :color="optionColor(option)" variant="soft">{{ option.label || '标签' }}</QuireTag></div>
        </div>
        <QuireButton variant="outline" :disabled="busy" @click="addOption">添加选项</QuireButton>
      </div>
      <p v-if="error" class="dv-field-error" role="alert">{{ error }}</p>
      <small>{{ field ? '修改类型时，现有值需符合新类型。' : '创建后自动显示在当前视图。' }}</small>
    </form>
    <template #footer><div class="dv-field-footer">
      <QuireButton v-if="field && field.id !== data.primaryFieldId" variant="outline" color="danger" :disabled="busy" @click="emit('apply', [{type: 'delete-field', fieldId: field.id}])">删除字段</QuireButton>
      <span class="dv-spacer" /><QuireButton variant="outline" :disabled="busy" @click="emit('close')">取消</QuireButton>
      <QuireButton :form="formId" type="submit" variant="solid" color="primary" :disabled="busy" :busy="busy">{{ field ? '保存字段' : '创建字段' }}</QuireButton>
    </div></template>
  </QuireTaskPanel>
</template>
