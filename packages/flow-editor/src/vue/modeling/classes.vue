<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref } from "vue";
import { QuireButton, QuireDialogContent, QuireField, QuireInput, QuireTextarea } from "@quirekit/ui/vue";
import type { FlowchartNode, FlowchartNodeContent } from "@quirekit/flowchart";

const { t, failure } = useFlowMessages();
const props = defineProps<{
  /** Captured class source, independent of the mutable selection. */ node: FlowchartNode;
  /** Guarded atomic mutation owned by the surrounding editor. */ apply: (content: FlowchartNodeContent) => void;
}>();
const emit = defineEmits<{ close: [] }>();
const title = ref(props.node.text), attributes = ref(props.node.uml!.attributes.join("\n")), operations = ref(props.node.uml!.operations.join("\n"));
const composing = ref(false), error = ref("");
/** @param text - A section draft. @returns Literal lines, keeping meaningful spaces and visibility prefixes. */
function rows(text: string): string[] { return text === "" ? [] : text.split(/\r?\n/u); }
const valid = computed(() => [attributes.value, operations.value].every(text => rows(text).length <= 100 && rows(text).every(line => line.length <= 300 && !line.includes("\t"))));
/** Applies only an explicit, complete non-composing draft. */
function save(): void {
  if (composing.value || !valid.value) return;
  try {
    props.apply({ text: title.value, uml: { attributes: rows(attributes.value), operations: rows(operations.value) } }); emit("close");
  } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); }
}
</script>

<template>
  <QuireDialogContent :title="t('编辑类成员')" :description="t('每行一个成员，保留 + 公有、− 私有、# 受保护、~ 包可见及类型、方法签名。')" size="large">
    <form class="qk-flow-class-form" @submit.prevent="save" @compositionstart="composing = true" @compositionend="composing = false">
      <QuireField :label="t('类名称')" width="100%" v-slot="{ controlProps }"><QuireInput v-bind="controlProps" v-model="title" width="100%" :maxlength="10000" /></QuireField>
      <div class="qk-flow-class-form__sections">
        <QuireField :label="t('属性（每行一个）')" width="100%" v-slot="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="attributes" width="100%" :rows="8" :maxlength="30100" spellcheck="false" /></QuireField>
        <QuireField :label="t('方法（每行一个）')" width="100%" v-slot="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="operations" width="100%" :rows="8" :maxlength="30100" spellcheck="false" /></QuireField>
      </div>
      <p v-if="!valid" role="status">{{ t('每个分区最多 100 行，每行最多 300 字符，不支持制表符。') }}</p>
      <p v-if="error" role="alert">{{ failure(error) }}</p>
    </form>
    <template #footer>
      <QuireButton variant="outline" @click="emit('close')">{{ t('取消') }}</QuireButton>
      <QuireButton variant="solid" color="primary" :disabled="composing || !valid" @click="save">{{ t('应用类成员') }}</QuireButton>
    </template>
  </QuireDialogContent>
</template>

<style scoped>
.qk-flow-class-form { display: grid; gap: var(--qk-space-group); min-width: 0; }
.qk-flow-class-form__sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--qk-space-group); }
@media (max-width: 620px) { .qk-flow-class-form__sections { grid-template-columns: minmax(0, 1fr); } }
</style>
