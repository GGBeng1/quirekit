<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref } from "vue";
import { QuireButton, QuireIcon, QuireIconButton, QuireDialogContent, QuireInput, QuireField, QuireSelect } from "@quirekit/ui/vue";
import type { FlowchartNode, FlowchartNodeContent, FlowchartFieldKey } from "@quirekit/flowchart";

const { t, failure } = useFlowMessages();
const props = defineProps<{
  /** Stable source captured only when the dialog opens. */ node: FlowchartNode;
  /** Applies against the opening target and instance, or throws. */ apply: (content: FlowchartNodeContent) => void;
}>();
const emit = defineEmits<{ close: [] }>();
const title = ref(props.node.text), error = ref(""), composing = ref(false);
let serial = 0;
const fields = ref((props.node.entity?.fields ?? []).map(field => ({ ...field, localId: serial++ })));
const keys = computed(() => [{ value: "none", label: t("普通字段") }, { value: "primary", label: t("PK 主键") }, { value: "foreign", label: t("FK 外键") }, { value: "primary-foreign", label: "PK/FK" }]);
const valid = computed(() => fields.value.every(field => field.name.trim().length > 0 && field.name.length <= 300 && field.type.length <= 300));
/** @param index - Current row. @param offset - Adjacent destination. */
function move(index: number, offset: number): void {
  const target = index + offset;
  if (target < 0 || target >= fields.value.length) return;
  [fields.value[index], fields.value[target]] = [fields.value[target]!, fields.value[index]!];
}
/** Commits one explicit draft, never a composition or an invalid field. */
function save(): void {
  if (composing.value || !valid.value) return;
  try {
    props.apply({ text: title.value, entity: { fields: fields.value.map(({ name, type, key }) => ({ name, type, key })) } });
    emit("close");
  } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); }
}
</script>

<template>
  <QuireDialogContent :title="t('编辑实体字段')" :description="t('字段顺序与 PK/FK 标记保存在图形源中。连线连接实体轮廓，不随字段行绑定。')" size="large" class="qk-flow-members">
    <form id="qk-flow-members-form" class="qk-flow-members__form" @submit.prevent="save" @compositionstart="composing = true" @compositionend="composing = false">
      <QuireField :label="t('实体名称')" width="100%" v-slot="{ controlProps }"><QuireInput v-bind="controlProps" v-model="title" width="100%" :maxlength="10000" /></QuireField>
      <div class="qk-flow-members__head" aria-hidden="true"><span>{{ t('字段名') }}</span><span>{{ t('类型') }}</span><span>{{ t('键') }}</span><span>{{ t('顺序') }}</span></div>
      <div class="qk-flow-members__rows" role="group" :aria-label="t('实体字段')">
        <div v-for="(field, index) in fields" :key="field.localId" class="qk-flow-members__row">
          <QuireInput v-model="field.name" :aria-label="t('字段 {index} 名称', { index: index + 1 })" width="100%" :maxlength="300" />
          <QuireInput v-model="field.type" :aria-label="t('字段 {index} 类型', { index: index + 1 })" width="100%" :maxlength="300" />
          <QuireSelect :model-value="field.key" :items="keys" :label="t('字段 {index} 键', { index: index + 1 })" width="100%" @update:model-value="field.key = $event as FlowchartFieldKey" />
          <div class="qk-flow-members__row-actions">
            <QuireIconButton variant="ghost" :label="t('上移字段 {index}', { index: index + 1 })" :disabled="index === 0" @click="move(index, -1)"><QuireIcon name="arrowUp" /></QuireIconButton>
            <QuireIconButton variant="ghost" :label="t('下移字段 {index}', { index: index + 1 })" :disabled="index === fields.length - 1" @click="move(index, 1)"><QuireIcon name="arrowDown" /></QuireIconButton>
            <QuireIconButton variant="ghost" :label="t('删除字段 {index}', { index: index + 1 })" @click="fields.splice(index, 1)"><QuireIcon name="trash" /></QuireIconButton>
          </div>
        </div>
      </div>
      <QuireButton variant="outline" :disabled="fields.length >= 100" @click="fields.push({ localId: serial++, name: 'field', type: '', key: 'none' })">{{ t('添加字段') }}</QuireButton>
      <p v-if="!valid" role="status">{{ t('请填写字段名，每项最多 300 字符。') }}</p>
      <p v-if="error" role="alert">{{ failure(error) }}</p>
    </form>
    <template #footer>
      <QuireButton variant="outline" @click="emit('close')">{{ t('取消') }}</QuireButton>
      <QuireButton color="primary" variant="solid" :disabled="composing || !valid" @click="save">{{ t('应用字段') }}</QuireButton>
    </template>
  </QuireDialogContent>
</template>

<style scoped>
.qk-flow-members__form { display: grid; gap: var(--qk-space-group); min-width: 0; }
.qk-flow-members__head, .qk-flow-members__row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1.5fr) minmax(100px, 1fr) 108px; gap: var(--qk-space-inline); align-items: center; }
.qk-flow-members__head { color: var(--qk-color-text-secondary); font-size: 12px; }
.qk-flow-members__rows { display: grid; gap: var(--qk-space-inline); max-height: 340px; overflow: auto; padding: 2px; }
.qk-flow-members__row-actions { display: flex; gap: 2px; }
@media (max-width: 620px) { .qk-flow-members__row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .qk-flow-members__head { display: none; } }
</style>
