<script setup lang="ts">
import { ref } from "vue";
import QuireForm from "../form.vue";
import QuireFormField from "../../form-field/form-field.vue";
import QuireSchemaForm from "../../schema-form/schema-form.vue";
import QuireInput from "../../input/input.vue";
import type { QuireKitFormValues } from "../types";
import type { QuireKitSchemaNode } from "../../schema-form/types";

const saved = ref("");
const initialValues = { title: "季度设计回顾" };
const parameters = { notify: true, email: "design@example.com" };
const fields: QuireKitSchemaNode[] = [
  { name: "notify", label: "邮件通知", control: "switch" },
  { name: "email", label: "收件邮箱", control: "input", required: true,
    visible: values => values.notify === true, props: { type: "email" } }
];

/** Records the value actually supplied to the public save callback.
 * @param values - Validated form snapshot.
 */
function save(values: QuireKitFormValues): void { saved.value = String(values.title); }
</script>

<template>
  <QuireForm :initial-values="initialValues" :on-submit="save" aria-label="手写模板">
    <template #default="{ meta }">
      <QuireFormField v-slot="{ controlProps, value }" name="title" label="文档标题" required>
        <QuireInput v-bind="controlProps" :model-value="String(value ?? '')" />
      </QuireFormField>
      <output data-dirty>{{ String(meta.dirty) }}</output>
    </template>
    <template #actions="{ resetForm }">
      <button type="submit">保存</button>
      <button type="button" @click="resetForm()">重置</button>
    </template>
  </QuireForm>
  <output data-saved>{{ saved }}</output>
  <QuireSchemaForm :fields="fields" :initial-values="parameters" aria-label="配置模板" />
</template>
