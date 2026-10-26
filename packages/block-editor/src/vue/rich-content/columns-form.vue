<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { ref, computed } from "vue";
import type { Editor, QuireJSONContent } from "@quirekit/core";
import { QuireDialogRoot, QuireDialogContent, QuirePresetGallery, QuireButton } from "@quirekit/ui/vue";
import type { RichContentRequest } from "../../rich-content/types";
import { createColumns } from "../../columns/model";

const { t, localize } = useBlockLocale();
const props=defineProps<{/** Owner. */ editor:Editor;/** Captured source. */ request:RichContentRequest;/** Source rejection. */ error:string}>();
const emit=defineEmits<{save:[content:readonly QuireJSONContent[]];close:[]}>();
const presets=[{value:"equal",label:"两栏",widths:[50,50]},{value:"left",label:"左窄右宽",widths:[33,67]},{value:"right",label:"左宽右窄",widths:[67,33]},{value:"three",label:"三栏",widths:[34,33,33]},{value:"four",label:"四栏",widths:[25,25,25,25]}];
const value=ref(presets.find(item=>JSON.stringify(item.widths)===JSON.stringify(props.request.node?.attrs.widths))?.value??"equal");
const failure=ref("");
const selected=computed(()=>presets.find(item=>item.value===value.value)!);
/** Confirms exactly one content-preserving layout update. */
function save():void {
  if(props.request.node) {
    if(props.editor.state.doc!==props.request.doc||!props.editor.commands.setBlockColumns(props.request.range.from,selected.value.widths)){failure.value="文档或权限已变化，请关闭后重新打开";return;}
    props.editor.commands.closeHistory();emit("close");
  } else emit("save",[createColumns(selected.value.widths)]);
}
</script>
<template>
  <QuireDialogRoot open :restore-focus="false" @update:open="!$event&&emit('close')">
    <QuireDialogContent :title="t('分栏布局')" size="small" :error-text="t(error||failure)">
      <QuirePresetGallery v-model="value" :items="localize(presets)" :label="t('栏数与比例')" :max-columns="3" min-item-width="96px">
        <template #preview="{item}"><div class="qk-rich-column-preview"><i v-for="(width,i) in presets.find(p=>p.value===item.value)!.widths" :key="i" :style="{flex:width}" /></div></template>
      </QuirePresetGallery>
      <p class="qk-rich-help">{{ t("内容可以直接编辑；拖动栏间分隔线调整宽度。减少栏数会合并内容。") }}</p>
      <template #footer><QuireButton variant="text" @click="emit('close')">{{ t("取消") }}</QuireButton><QuireButton variant="solid" color="primary" @click="save">{{request.node?t('应用'):t('插入分栏')}}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
