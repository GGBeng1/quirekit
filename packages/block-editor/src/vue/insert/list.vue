<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, nextTick } from "vue";
import type { Editor } from "@quirekit/core";
import type { BlockSlotRef } from "@quirekit/extensions";
import { QuireCommandList, QuireMenuGroup, QuireMenuItem, QuireMenuSubmenu, QuireIcon, QuireScrollArea, QuireTableSizePicker, type QuireTableSize, type QuireKitCommandListHandle } from "@quirekit/ui/vue";
import { blockInsertItems } from "../../ui/insert/catalog";
import { acceptBlockSlash, insertBlockContent, insertAtBlockSlot, isDeferredBlockInsert } from "../../ui/insert/execute";
import type { BlockSlashTarget } from "../../ui/insert/types";
import { readBlockTableFeature } from "../../table/feature";

const { t, localize, locale } = useBlockLocale();

const props = withDefaults(defineProps<{
  /** Canonical document session. */ editor: Editor;
  /** Captured adjacent slot; omitted for the current selection. */ destination?: BlockSlotRef | undefined;
  /** Committed trigger paragraph; absent for ordinary menu insertion. */ slashTarget?: BlockSlashTarget;
  /** Native editor input retaining focus while slash navigation is virtual. */ focusOwner?: HTMLElement | null;
  /** Search text owned by the standalone picker; submenus show the full directory. */ query?: string;
}>(), { query: "" });
const emit = defineEmits<{ close: [] }>();
const table = ref(false);
const error = ref("");
const list = ref<QuireKitCommandListHandle>();
const catalog = computed(() => blockInsertItems(props.editor, props.query, !!props.destination || !!props.slashTarget, locale.value));
const groups = computed(() => ["常用内容", "容器与提示", "布局与链接", "媒体与附件", "图形与数据", "文本与列表"].map(label => ({ label, items: catalog.value.filter(item => item.group === label) })).filter(group => group.items.length));
const commands = computed(() => groups.value.flatMap(group => group.items.map(item => ({ key: item.id, label: item.label, group: group.label, icon: item.icon }))));
const labels = computed(() => ({ title: t("插入表格"), rows: t("行数"), columns: t("列数"), custom: t("自定义尺寸"), back: t("返回网格"), submit: t("插入"),
  /** @param size - Dimensions. @returns Accessible Chinese label. */
  size: (size: QuireTableSize) => t("{rows} 行 × {columns} 列", { rows: size.rowCount, columns: size.columnCount }) }));
/** @param id - Installed command chosen by the user. */
async function choose(id: string): Promise<void> {
  // Dismiss the trigger before a command transaction or deferred task changes focus.
  // The captured paragraph remains the sole replacement authority after dismissal.
  const target = props.slashTarget;
  if (target) emit("close");
  const accepted = target ? acceptBlockSlash(props.editor, target, id)
    : props.destination ? insertAtBlockSlot(props.editor, props.destination, id) : insertBlockContent(props.editor, id);
  if (accepted) {
    if (!target) emit("close");
    if (!isDeferredBlockInsert(id)) { await nextTick(); props.editor.commands.focus(); }
  } else error.value = "插入位置已变化，请重新打开菜单";
}
/** @param event - Keyboard event from the native editor input. @returns Whether public list navigation handled it. */
function handleKeydown(event: KeyboardEvent): boolean { return list.value?.handleKeydown(event) ?? false; }
defineExpose<QuireKitCommandListHandle>({ handleKeydown });
/** @param size - Validated tuple from the shared Classic/Block picker. */
async function insertTable(size: QuireTableSize): Promise<void> {
  const content = readBlockTableFeature(props.editor)?.createContent(size);
  const accepted = props.editor.isEditable && (props.destination
    ? !!content && props.editor.commands.insertBlockAt({ destination: props.destination, replaceEmpty: true, content })
    : props.editor.commands.insertBlockTable(size));
  if (accepted) { emit("close"); await nextTick(); props.editor.commands.focus(); }
  else error.value = "当前位置无法插入表格";
}
</script>
<template>
  <QuireScrollArea scrollbar-visibility="always" viewport-class="qk-block-insert-viewport">
    <QuireCommandList v-if="slashTarget" ref="list" :label="t('内容块')" :items="localize(commands)" :focus-owner="focusOwner" @select="choose">
      <template #leading="{ index }"><QuireIcon :name="commands[index]!.icon" /></template>
    </QuireCommandList>
    <template v-else>
      <QuireMenuGroup v-for="group in groups" :key="group.label" :label="t(group.label)">
        <template v-for="item in group.items" :key="item.id">
          <QuireMenuSubmenu v-if="item.id === 'table'" v-model:open="table" width="auto">
            <template #leading><QuireIcon :name="item.icon" /></template>
            <template #trigger>{{ t(item.label) }}</template>
            <QuireTableSizePicker v-if="table" :labels="labels" :error="t(error)" @select="insertTable" @cancel="table = false" />
          </QuireMenuSubmenu>
          <QuireMenuItem v-else :value="item.id" :close-on-select="false" @select="choose(item.id)"><template #leading><QuireIcon :name="item.icon" /></template>{{ t(item.label) }}</QuireMenuItem>
        </template>
      </QuireMenuGroup>
    </template>
    <p v-if="!catalog.length" role="status" class="qk-type-helper qk-block-insert-message">{{ t("没有匹配的内容块") }}</p>
    <p v-if="error" role="status" class="qk-type-helper qk-block-insert-message">{{ t(error) }}</p>
  </QuireScrollArea>
</template>
