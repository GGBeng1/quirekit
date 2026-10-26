<script setup lang="ts">
import { useBlockLocale } from "../../localization/use-locale";
import { reactive, watch } from "vue";
import type { EditorState } from "@quirekit/pm";
import { EditorUIFontInput } from "@quirekit/editor-ui/vue";
import { QuireButton, QuireDialogRoot, QuireDialogContent } from "@quirekit/ui/vue";
import type { BlockToolbarProps } from "../../types";
import { blockFontChoices } from "../../../ui/toolbar/options";
import { useBlockFontScope } from "./state";
import { restoreBlockEditorFocus } from "../../../ui/focus";

const { t, localize } = useBlockLocale();
const props = defineProps<BlockToolbarProps>();
const { dialog } = useBlockFontScope(props.editor);
const draft = reactive({ eastAsia: "", latin: "", complexScript: "" });
const labels = { eastAsia: "中文字体", latin: "西文字体", complexScript: "复杂文字字体" };
const options = blockFontChoices.filter(item => item.value !== "font:default").map(item => ({ ...item, value: item.value.slice(5) }));
let source: EditorState | null = null;
watch(dialog, open => { if (open) { source = props.editor.state.pm; Object.assign(draft, props.format.fonts); } });
/** Commits independent script families together to the captured selection. */
function apply(): void {
 const state = props.editor.state.pm;
 if (!props.editor.isEditable || !source || source.doc !== state.doc || !source.selection.eq(state.selection)) { dialog.value = false; return; }
 const chain = props.editor.chain();
 if (draft.eastAsia) chain.setEastAsiaFontFamily(draft.eastAsia); else chain.unsetEastAsiaFontFamily();
 if (draft.latin) chain.setLatinFontFamily(draft.latin); else chain.unsetLatinFontFamily();
 if (draft.complexScript) chain.setComplexScriptFontFamily(draft.complexScript); else chain.unsetComplexScriptFontFamily();
 chain.run(); dialog.value = false; restoreBlockEditorFocus(props.editor);
}
</script>
<template>
 <QuireDialogRoot v-model:open="dialog" :restore-focus="false">
  <QuireDialogContent :title="t('字体配置')" size="small" as="form" @submit.prevent="apply">
   <div style="display: grid; gap: 16px">
    <EditorUIFontInput v-for="(label, target) in labels" :key="target" :label="t(label)" :value="draft[target] || null" :placeholder="t('继承默认字体')"
     :options="localize(options)" :disabled="!editable" allow-custom-value @select="draft[target] = $event ?? ''" />
   </div>
   <template #footer><QuireButton variant="text" @click="dialog = false">{{ t("取消") }}</QuireButton><QuireButton type="submit" :disabled="!editable">{{ t("应用") }}</QuireButton></template>
  </QuireDialogContent>
 </QuireDialogRoot>
</template>
