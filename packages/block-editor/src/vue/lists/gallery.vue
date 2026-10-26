<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorListPresetGallery } from "@quirekit/editor-ui/vue";
import { QuireButton, QuireField, QuireInputNumber, QuireSpace } from "@quirekit/ui/vue";
import { readBlockListFeature } from "../../lists/feature";
import { restoreBlockEditorFocus } from "../../ui/focus";

const { t, localize } = useBlockLocale();

const props = defineProps<{
  /** Owning session; gallery reads are limited to the opened popup. */
  readonly editor: Editor;
  /** Shared preset family. */
  readonly kind: "bullet" | "ordered";
}>();
const emit = defineEmits<{ close: [] }>();
const feature = readBlockListFeature(props.editor);
const items = computed(() => feature?.presets(props.editor).filter(item => item.kind === props.kind) ?? []);
const selected = computed(() => items.value.find(item => feature?.isPresetActive(props.editor, item.value))?.value ?? null);
const scopes = [{ value: "singleLevel", label: "单级列表" }, { value: "multilevel", label: "多级列表" }];
const start = ref("1");
const canContinue = feature?.canContinue(props.editor.state.pm) ?? false;
const canRestart = feature?.kind(props.editor.state.pm.selection.$from.parent, props.editor.state.doc) === "ordered";
/** @param accepted - Canonical command result. */
function finish(accepted: boolean): void {
  if (!accepted) return;
  emit("close");
  restoreBlockEditorFocus(props.editor);
}
</script>

<template>
  <EditorListPresetGallery :label="t(kind === 'bullet' ? t('项目符号预设') : t('编号预设'))" :items="localize(items)" :scopes="localize(scopes)" :selected="selected"
    @select="finish(editor.commands.applyBlockListPreset($event))">
    <QuireSpace gap="inline" :wrap="false" block>
      <QuireButton block style="flex: 1 1 0; min-width: 0" variant="ghost" size="sm" @click="finish(editor.commands.clearBlockList())">{{ t("取消列表") }}</QuireButton>
      <QuireButton v-if="kind === 'ordered'" block style="flex: 1 1 0; min-width: 0" variant="soft" size="sm" :disabled="!canContinue" @click="finish(editor.commands.continueBlockList())">{{ t("继续前一列表编号") }}</QuireButton>
    </QuireSpace>
    <QuireSpace v-if="kind === 'ordered'" gap="inline" :wrap="false" align="end" block>
      <QuireField :label="t('起始编号')" style="flex: 1; min-width: 0">
        <template #default="{ controlProps }">
          <QuireInputNumber v-bind="controlProps" v-model="start" :label="t('起始编号')" :min="1" :step="1" />
        </template>
      </QuireField>
      <QuireButton size="sm" :disabled="!canRestart || !Number.isInteger(Number(start)) || Number(start) < 1" @click="finish(editor.commands.restartBlockList(Number(start)))">{{ t("重新编号") }}</QuireButton>
    </QuireSpace>
  </EditorListPresetGallery>
</template>
