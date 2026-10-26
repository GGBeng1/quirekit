<script setup lang="ts">
import { useBlockLocale } from "@quirekit/block-editor/vue";
import { computed, markRaw, nextTick, onBeforeUnmount, ref, toRef, watch } from "vue";
import type { Editor, QuireClipboardPasteResult } from "@quirekit/core";
import { EditorUIAnchoredOverlay } from "@quirekit/editor-ui/vue";
import { QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { executeTableAction } from "../ui/actions";
import { tableToolbarItems } from "../ui/catalog";
import type { BlockTableAction } from "../ui/types";
import { useTableContext } from "./context";
import { distributeBlockTable } from "../chrome/distribute";
import TableChrome from "./chrome.vue";
import TableFill from "./fill.vue";
import TableStyles from "./styles/panel.vue";
import { setBlockTableHeading } from "../styles/commands";
import type { BlockTableHeading } from "../styles/types";

const { t, localize } = useBlockLocale();
const props = defineProps<{ editor: Editor; editable: boolean; viewport?: HTMLElement }>();
const { target, model, scrollModel, identity, selectionOwned } = useTableContext(props.editor, toRef(props, "viewport"));
const items = computed(() => target.value ? tableToolbarItems(props.editor, target.value) : []);
const overlayAnchor = computed(() => {
 const rect = model.value?.fragments[0]?.tableRect;
 return rect ? { x: rect.left, y: rect.top, rects: [{ x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top }] } : null;
});
const message = ref("");
const renderers = { fill: markRaw(TableFill), styles: markRaw(TableStyles) };
const generation = ref(0);
let ownHeadingChange = false;
// A popup belongs to its captured cell range. Replacing that target releases
// every open control before a later click can write to another selection.
watch(target, () => { if (!ownHeadingChange) generation.value++; message.value = ""; });
/** @param key - Region toggled inside this popup. @param value - Requested state. */
function heading(key: BlockTableHeading, value: boolean): void {
  if (!target.value) return;
  // Only our synchronous, source-checked look change retains this popup. External
  // document/target changes still revoke every old menu and pending control.
  ownHeadingChange = true;
  setBlockTableHeading(props.editor, target.value, key, value);
  void nextTick(() => { ownHeadingChange = false; });
}
/** @param result - Final shared paste result; feedback never dispatches the rejected transaction. */
function pasteResult(result: QuireClipboardPasteResult): void {
  const detail = result.transaction.getMeta("quirekit:word-table-paste");
  if (result.status === "rejected" && detail?.status === "rejected") {
    message.value = detail.reason === "incompatible-merge" ? "粘贴内容与合并单元格结构不兼容，原内容已保留。"
      : "粘贴的表格结构暂不支持，原内容已保留。";
  }
}
props.editor.on("clipboardPasteResult", pasteResult);
onBeforeUnmount(() => props.editor.off("clipboardPasteResult", pasteResult));
/** @param event - Canonical operation chosen in the contextual toolbar. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  if ((event.value === "distributeRows" || event.value === "distributeColumns") && target.value && model.value) {
    distributeBlockTable(props.editor, target.value, model.value, event.value === "distributeRows" ? "row" : "column"); props.editor.commands.focus(); return;
  }
  if (!target.value || !executeTableAction(props.editor, target.value, event.value as BlockTableAction)) message.value = "表格已变化，请重新选择";
  else { message.value = ""; props.editor.commands.focus(); }
}
</script>
<template>
  <TableChrome v-if="editable && target && model && scrollModel && viewport" :editor="editor" :target="target" :model="model" :scroll-model="scrollModel" :viewport="viewport" :identity="identity" :selection-owned="selectionOwned" />
  <EditorUIAnchoredOverlay :show="!!target && editable && selectionOwned" :anchor="overlayAnchor" placement="top-start" layer="chrome">
  <div data-block-table-tools>
    <QuireToolbar :key="generation" :label="t('表格操作')" :items="localize(items)" :renderers="renderers" :context="{ editor, target, heading }" variant="elevated" preserve-focus @execute="execute" />
    <span v-if="message" class="qk-type-helper" role="status">{{ t(message) }}</span>
  </div>
  </EditorUIAnchoredOverlay>
</template>
