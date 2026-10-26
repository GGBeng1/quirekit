<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref, watch } from "vue";
import { QuireButton, QuireDialogContent, QuireIcon, QuireInput, QuireSegmented } from "@quirekit/ui/vue";
import type { FlowLibraryItem } from "../../library/types";
import type { FlowLibraryPanelProps } from "./types";
import { useFlowLibrary } from "./session";
import { useLibraryPreview } from "./preview";
import "./styles.css";

const { t, failure } = useFlowMessages();
const props=defineProps<FlowLibraryPanelProps>(),emit=defineEmits<{close:[]}>();
const model=useFlowLibrary(props,()=>emit("close"));
const {snapshot,draft,name,selected,busy,error,status}=model;
const query=ref(""),kind=ref("all"),mount=ref<HTMLElement>(),file=ref<HTMLInputElement>(),confirm=ref<FlowLibraryItem>();
const items=computed(()=>snapshot.value?.library.items.filter(item=>(kind.value==="all"||item.kind===kind.value)&&item.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()))??[]);
const choice=computed(()=>snapshot.value?.library.items.find(i=>i.id===selected.value));
watch(items,values=>{if(!values.some(i=>i.id===selected.value))selected.value=values[0]?.id??"";});
watch(selected,()=>{confirm.value=undefined;});
const preview=useLibraryPreview(mount,()=>draft.value?.document??choice.value?.document,()=>props.theme);
/** @param event - Native file chooser result. @returns Completion of a bounded import. */
async function importFile(event:Event):Promise<void>{const input=event.target as HTMLInputElement,chosen=input.files?.[0];input.value="";if(chosen)await model.importFile(chosen);}
/** @returns Confirmed deletion; errors keep the selected source recoverable. */
async function remove():Promise<void>{if(confirm.value){await model.remove(confirm.value);confirm.value=undefined;}}
</script>
<template>
  <QuireDialogContent :title="t('我的图形库')" :description="t('收藏整张图或常用组件，在其他图中继续使用。')" size="large" class="qk-flow-library" :error-text="failure(error)" :busy="busy">
    <div v-if="!draft" class="qk-flow-library__tools">
      <QuireSegmented v-model="kind" :label="t('素材类型')" :items="[{value:'all',label:t('全部')},{value:'template',label:t('我的模板')},{value:'component',label:t('我的组件')}]" />
      <QuireInput v-model="query" :aria-label="t('搜索我的图形')" :placeholder="t('搜索名称')" width="220px" clearable />
      <div class="qk-flow-library__actions"><QuireButton variant="outline" :disabled="busy" @click="model.begin('template')">{{ t('保存整图为模板') }}</QuireButton><QuireButton variant="outline" :disabled="busy || !editor.getState().selectedIds.length" @click="model.begin('component')">{{ t('保存选区为组件') }}</QuireButton></div>
    </div>
    <div class="qk-flow-library__body">
      <div v-if="draft" class="qk-flow-library__draft">
        <h3>{{ draft.original ? t('重命名') : draft.kind === 'template' ? t('保存模板') : t('保存组件') }}</h3>
        <QuireInput v-model="name" :aria-label="t('图形名称')" :placeholder="t('起一个便于查找的名称')" :maxlength="80" :disabled="busy" @keydown.enter.prevent="model.save" />
        <p>{{ draft.kind === 'template' ? t('模板保存整张画布，使用时替换当前内容。') : t('组件保留选中图形及内部连接，使用时插入当前画布。') }}</p>
        <div class="qk-flow-library__actions"><QuireButton variant="ghost" :disabled="busy" @click="draft = undefined">{{ t('取消编辑') }}</QuireButton><QuireButton color="primary" variant="solid" :disabled="busy || !snapshot || !name.trim()" @click="model.save">{{ t('保存到图形库') }}</QuireButton></div>
      </div>
      <div v-else class="qk-flow-library__list" role="group" :aria-label="t('我的图形列表')">
        <QuireButton v-for="item in items" :key="item.id" variant="ghost" :aria-label="item.name" :aria-pressed="selected === item.id" class="qk-flow-library__item" @click="selected = item.id">
          <span class="qk-flow-library__item-content"><QuireIcon :name="item.kind === 'template' ? 'layoutGrid' : 'group'" :size="20" /><span class="qk-flow-library__item-copy">{{ item.name }}<small>{{ item.kind === 'template' ? t('模板') : t('组件') }} · {{ t('{count} 个图形', { count: item.document.nodes.length }) }}</small></span></span>
        </QuireButton>
        <p v-if="!items.length" class="qk-flow-library__empty">{{ snapshot ? query ? t('没有匹配的图形') : t('还没有收藏，先保存一张图或一个组件。') : t('正在读取图形库…') }}</p>
      </div>
      <aside class="qk-flow-library__detail" :aria-label="t('我的图形预览')">
        <div class="qk-flow-library__preview"><img v-if="preview.url.value" :src="preview.url.value" :alt="t('所选图形预览')" /><span v-else>{{ preview.loading.value ? t('生成预览…') : preview.error.value ? t('预览暂不可用') : t('选择图形查看预览') }}</span></div>
        <template v-if="choice && !draft"><h3>{{ choice.name }}</h3><p>{{ choice.kind === 'template' ? t('替换整张画布，可以撤销恢复。') : t('插入当前视口，保留独立的图形和连接。') }}</p>
          <div class="qk-flow-library__actions"><QuireButton :disabled="busy" variant="ghost" @click="model.rename(choice)">{{ t('重命名') }}</QuireButton><QuireButton :disabled="busy" variant="ghost" @click="confirm = choice">{{ t('删除') }}</QuireButton></div>
        </template>
        <div v-if="confirm" class="qk-flow-library__confirm" role="alert"><p>{{ t('删除“{name}”？已插入的图形不会受影响。', { name: confirm.name }) }}</p><QuireButton variant="ghost" @click="confirm = undefined">{{ t('保留') }}</QuireButton><QuireButton variant="solid" :disabled="busy" @click="remove">{{ t('确认删除') }}</QuireButton></div>
      </aside>
    </div>
    <div ref="mount" class="qk-flow-library__renderer" aria-hidden="true" inert></div><input ref="file" type="file" accept=".json,application/json" hidden @change="importFile" />
    <template #status><span>{{ failure(error) || status || (store ? t('使用宿主提供的共享图形库。') : t('保存在本机同源图形库；导出库文件可迁移到其他站点。')) }}</span></template>
    <template #footer>
      <QuireButton variant="ghost" :disabled="busy" @click="model.retry">{{ t('刷新') }}</QuireButton><QuireButton variant="ghost" :disabled="busy || !snapshot" @click="file?.click()">{{ t('导入库文件') }}</QuireButton><QuireButton variant="ghost" :disabled="busy || !snapshot" @click="model.exportFile">{{ t('导出库文件') }}</QuireButton>
      <QuireButton variant="outline" @click="emit('close')">{{ t('关闭') }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="busy || disabled || !!draft || !choice" @click="choice && model.apply(choice)">{{ choice?.kind === 'component' ? t('插入组件') : t('使用模板') }}</QuireButton>
    </template>
  </QuireDialogContent>
</template>
