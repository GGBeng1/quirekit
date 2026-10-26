<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIcon, QuireIconButton, QuireInput } from "@quirekit/ui/vue";
import type { FlowchartEditor, FlowchartSearchResult } from "@quirekit/flowchart-x6";
import "./styles.css";

const { t, failure } = useFlowMessages();
const props = defineProps<{ /** Live neutral navigation owner. */ editor: FlowchartEditor }>();
const emit = defineEmits<{ /** Dismisses the panel and restores canvas focus. */ close: [] }>();
const query = ref(""), root = ref<HTMLElement>(), error = ref("");
const result = shallowRef<FlowchartSearchResult>({ total: 0, items: [] });
/** Reads titles only after a query or semantic invalidation, never after viewport/geometry changes. */
function refresh(): void { try { result.value = props.editor.searchNodes(query.value); error.value = ""; } catch (reason) { error.value = String(reason); } }
/** @param id - Current result identity, revalidated by the adapter. */
function locate(id: string): void { try { props.editor.locateNode(id); error.value = ""; } catch (reason) { refresh(); error.value = reason instanceof Error ? reason.message : String(reason); } }
/** @param event - Native input keyboard ownership, including IME composition. */
function key(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); emit("close"); }
  if (event.key === "Enter" && result.value.items[0]) { event.preventDefault(); locate(result.value.items[0].id); }
}
let stop = () => {};
watch(() => props.editor, editor => { stop(); stop = editor.subscribeSearch(refresh); refresh(); }, { immediate: true });
watch(query, refresh);
onMounted(() => root.value?.querySelector("input")?.focus());
onBeforeUnmount(() => stop());
</script>
<template>
  <section ref="root" class="qk-flow-navigation qk-flow-search" :aria-label="t('查找图形')" @keydown="key">
    <header><strong>{{ t('查找图形') }}</strong><QuireIconButton :label="t('关闭查找')" variant="ghost" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <QuireInput v-model="query" :aria-label="t('查找画布文字')" :placeholder="t('图形文字、字段或类成员')" :maxlength="1000" />
    <p class="qk-flow-navigation__hint" role="status">{{ query.trim() ? result.total > result.items.length ? t('找到 {count} 个图形，显示前 {shown} 个', { count: result.total, shown: result.items.length }) : t('找到 {count} 个图形', { count: result.total }) : t('输入文字查找，按 Enter 定位首个结果') }}</p>
    <div class="qk-flow-search__results">
      <QuireButton v-for="hit in result.items" :key="hit.id" variant="ghost" class="qk-flow-search__result" :aria-label="t('定位：{title}', { title: hit.title })" @click="locate(hit.id)"><span><strong>{{ hit.title }}</strong><small>{{ hit.preview }}</small></span></QuireButton>
    </div>
    <p v-if="error" role="alert">{{ failure(error) }}</p>
  </section>
</template>
