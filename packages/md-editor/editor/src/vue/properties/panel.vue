<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireCollapsible, QuireIcon, QuireInput } from "@quirekit/ui/vue";
import type { DocumentPropertiesProps } from "@quirekit/msfe-markdown-extras";
import type { MdDocumentPropertiesProps } from "./types";
import PropertyRow from "./row.vue";
import PropertyAction from "./action.vue";
import "./styles.css";
const props = defineProps<MdDocumentPropertiesProps>();
const english = computed(() => props.view.locale === "en");
const adding = ref(false), key = ref(""), value = ref(""), error = ref(""), root = ref<HTMLElement>();
const session = shallowRef<DocumentPropertiesProps>();
const open = computed({ get: () => !props.view.collapsed, set: value => { props.view.setCollapsed(!value); } });
const all = ref(false);
watch(() => props.view.readOnly, readOnly => { if (readOnly) adding.value = false; });
/** Captures one header revision; local text remains a draft until saved. */
async function begin(): Promise<void> {
  session.value = props.view; key.value = ""; value.value = ""; error.value = ""; adding.value = true;
  await nextTick(); root.value?.querySelector<HTMLInputElement>("[data-property-add] input")?.focus();
}
/** @param event - Optional cancel event; composition retains its own Escape key. Restores focus to the add action. */
async function close(event?: KeyboardEvent | MouseEvent): Promise<void> {
  if (event && "isComposing" in event && event.isComposing) return;
  adding.value = false; error.value = ""; await nextTick(); root.value?.querySelector<HTMLButtonElement>("[data-property-add-trigger]")?.focus();
}
/** @param event - Optional keyboard submit, respecting composition. */
function add(event?: KeyboardEvent): void {
  if (event?.isComposing || !session.value) return;
  event?.preventDefault();
  const result = session.value.change({ type: "add", key: key.value, value: value.value });
  if (result.ok) { all.value = true; void close(); }
  else error.value = english.value ? "Use a unique name; reopen the form if the document changed." : "请使用唯一的属性名；文档变化后请重新打开表单。";
}
</script>
<template>
  <section ref="root" class="msfe-document-properties md-properties" tabindex="-1" :aria-label="english ? 'Document properties' : '文档属性'">
    <QuireCollapsible v-model:open="open" :title="english ? 'Document properties' : '文档属性'" variant="plain" size="sm">
      <template #trigger><span class="md-properties__heading"><QuireIcon name="slidersHorizontal" :size="16" /><span>{{ english ? 'Document properties' : '文档属性' }}</span><span class="md-properties__muted">{{ view.data.entries.length }}</span></span></template>
      <div class="md-properties__rows">
        <PropertyRow v-for="(entry, index) in view.data.entries" v-show="all || index < 6" :key="entry.key" :entry="entry" :view="view" />
      </div>
      <div v-if="adding && !view.readOnly" data-property-add class="md-properties__add" @keydown.esc.stop="close">
        <QuireInput v-model="key" :aria-label="english ? 'Property name' : '属性名'" :placeholder="english ? 'Property name' : '属性名'" width="100%" size="sm" @keydown.enter="add" />
        <div class="md-properties__editor">
          <QuireInput v-model="value" :aria-label="english ? 'Property value' : '属性值'" :placeholder="english ? 'Property value' : '属性值'" width="100%" size="sm" @keydown.enter="add" />
          <div class="md-properties__actions">
            <PropertyAction :label="english ? 'Save' : '保存'" icon="check" primary @click="add()" />
            <PropertyAction :label="english ? 'Cancel' : '取消'" icon="close" @click="close" />
          </div>
        </div>
        <div v-if="error" role="alert" class="md-properties__error">{{ error }}</div>
      </div>
      <div class="md-properties__footer">
        <QuireButton v-if="!view.readOnly && !adding" data-property-add-trigger size="sm" variant="ghost" @click="begin"><template #leading><QuireIcon name="plus" /></template>{{ english ? 'Add property' : '添加属性' }}</QuireButton>
        <QuireButton v-if="view.data.entries.length > 6" size="sm" variant="ghost" :aria-expanded="all" @click="all = !all">{{ all ? (english ? 'Show fewer' : '收起更多属性') : (english ? `Show ${view.data.entries.length - 6} more` : `展开其余 ${view.data.entries.length - 6} 项`) }}</QuireButton>
        <QuireButton class="md-properties__source" size="sm" variant="ghost" @click="view.editSource"><template #leading><QuireIcon name="code" /></template>{{ english ? 'View source' : '查看源码' }}</QuireButton>
      </div>
    </QuireCollapsible>
  </section>
</template>
