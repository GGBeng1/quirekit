<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref } from "vue";
import { v4 } from "uuid";
import type { Editor, QuireJSONContent } from "@quirekit/core";
import { QuireDialogRoot, QuireDialogContent, QuirePresetGallery, QuireButton, QuireInput, QuireIconButton, QuireIcon, QuireField } from "@quirekit/ui/vue";
import type { RichContentRequest, BlockContentTemplate } from "../../rich-content/types";
import { blockContentTemplates } from "../../templates/catalog";
import { freshTemplateContent, readBlockTemplates, templateError, writeBlockTemplates } from "../../templates/library";

const { t } = useBlockLocale();
const props=defineProps<{/** Owner. */ editor:Editor;/** Captured insertion. */ request:RichContentRequest;/** Commit feedback. */ error:string}>();
const emit=defineEmits<{save:[content:readonly QuireJSONContent[]];close:[]}>();
const storage=props.editor.view.dom.ownerDocument.defaultView!.localStorage;
const custom=ref<BlockContentTemplate[]>(readBlockTemplates(storage)), selected=ref("meeting"), name=ref(""), message=ref(""), saving=ref(false);
const recipes=computed(()=>[...blockContentTemplates.map(item => ({ ...item, name: t(item.name), description: t(item.description), content: localizedRecipe(item.content) })),...custom.value]);
/** @param content - Only bundled, not user-authored template content. @returns The recipe in the current interface language. */
function localizedRecipe(content: readonly QuireJSONContent[]): QuireJSONContent[] {
  return content.map(node => ({ ...node, ...(node.text ? { text: t(node.text) } : {}),
    ...(node.attrs?.title ? { attrs: { ...node.attrs, title: t(String(node.attrs.title)) } } : {}),
    ...(node.content ? { content: localizedRecipe(node.content) } : {}) }));
}
const items=computed(()=>recipes.value.map(item=>({value:item.id,label:item.name,description:t(templateError(props.editor.state.schema,item.content))||item.description,disabled:!!templateError(props.editor.state.schema,item.content)})));
const current=computed(()=>recipes.value.find(item=>item.id===selected.value));
/** @param content - Canonical template. @returns A bounded, text-only miniature. */
function lines(content:readonly QuireJSONContent[]):string[] {
  const result:string[]=[];
  /** @param node - Recursive content. */
  function visit(node:QuireJSONContent):void {if(result.length>=6)return;if(node.type==="text"&&node.text)result.push(node.text);else node.content?.forEach(visit);}
  content.forEach(visit);return result;
}
/** Saves the source block or complete selected siblings as a local reusable recipe. */
function saveCurrent():void {
  if(!name.value.trim())return;
  try {
    const {doc,range}=props.request, $pos=doc.resolve(range.from);
    const sliced=range.to>range.from?doc.slice(range.from,range.to).content.toJSON() as QuireJSONContent[]|null:null;
    const content=sliced?.length&&sliced.every(item=>props.editor.state.schema.nodes[item.type??""]?.isBlock)?sliced:
      [$pos.depth? $pos.node($pos.depth).toJSON():doc.nodeAt(range.from)?.toJSON()].filter(Boolean) as QuireJSONContent[];
    const fresh=freshTemplateContent(content), reason=templateError(props.editor.state.schema,fresh);
    if(reason)throw new Error(reason);
    const item={id:v4(),name:name.value.trim(),description:"我的模板",content:fresh};
    writeBlockTemplates(storage,[...custom.value,item]);custom.value=[...custom.value,item];selected.value=item.id;saving.value=false;name.value="";message.value="";
  } catch(error) {message.value=error instanceof Error?error.message:"模板保存失败";}
}
/** @param id - Custom library identity. */
function remove(id:string):void {
  try {const next=custom.value.filter(item=>item.id!==id);writeBlockTemplates(storage,next);custom.value=next;if(selected.value===id)selected.value="meeting";}
  catch {message.value="本地模板无法保存，请重试";}
}
/** Validates installed capabilities before emitting one document insertion. */
function insert():void {
  if(!current.value)return;const content=freshTemplateContent(current.value.content);
  message.value=templateError(props.editor.state.schema,content);if(!message.value)emit("save",content);
}
</script>
<template>
  <QuireDialogRoot open :restore-focus="false" @update:open="!$event&&emit('close')">
    <QuireDialogContent :title="t('块模板')" size="medium" :error-text="t(error||message)">
      <QuirePresetGallery v-model="selected" :items="items" :label="t('选择模板')" :max-columns="2" min-item-width="180px">
        <template #preview="{item}"><div class="qk-rich-template-preview"><span v-for="(line,index) in lines(recipes.find(r=>r.id===item.value)!.content)" :key="index">{{line}}</span></div></template>
        <template #actions="{item}"><QuireIconButton v-if="custom.some(r=>r.id===item.value)" :label="t('删除模板：{name}', { name: item.label })" variant="ghost" @click="remove(item.value)"><QuireIcon name="trash" /></QuireIconButton></template>
      </QuirePresetGallery>
      <div v-if="saving" class="qk-rich-form-row">
        <QuireField :label="t('模板名称')"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="name" width="100%" @keydown.enter.prevent="saveCurrent" /></template></QuireField>
        <QuireButton :disabled="!name.trim()" variant="soft" @click="saveCurrent">{{ t("保存模板") }}</QuireButton>
      </div>
      <QuireButton v-else variant="text" @click="saving=true"><template #leading><QuireIcon name="plus" /></template>{{ t("将当前块存为模板") }}</QuireButton>
      <template #footer><QuireButton variant="text" @click="emit('close')">{{ t("取消") }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="!current||!!templateError(editor.state.schema,current.content)" @click="insert">{{ t("插入模板") }}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
