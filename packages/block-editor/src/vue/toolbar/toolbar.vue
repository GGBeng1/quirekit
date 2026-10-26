<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import ParagraphPanel from "../paragraph/panel.vue";
import FontDialog from "./fonts/dialog.vue";
import { useBlockFontScope } from "./fonts/state";
import type { BlockFontTarget } from "./fonts/types";
import BlockInsertToolbar from "../insert/toolbar.vue";
import BlockListGallery from "../lists/gallery.vue";
import { computed, markRaw } from "vue";
import type { QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuireToolbar } from "@quirekit/ui/vue";
import type { BlockToolbarProps } from "../types";
import { blockToolbarItems } from "../../ui/toolbar/catalog";
import { executeBlockToolbarAction } from "../../ui/toolbar/actions";
import BlockToolbarColor from "./color.vue";
import BlockToolbarUnderline from "./underline.vue";
import BlockToolbarField from "./field.vue";
import { useBlockLinkScope } from "../links/state";

const { t, localize } = useBlockLocale();


const props = defineProps<BlockToolbarProps & { /** Shared compact two-row selection surface. */ selection?: boolean }>();
const emit = defineEmits<{ search: []; feedback: [message: string] }>();
const renderers = { paragraph: markRaw(ParagraphPanel), field: markRaw(BlockToolbarField), color: markRaw(BlockToolbarColor), insert: markRaw(BlockInsertToolbar), underline: markRaw(BlockToolbarUnderline) };
const items = computed(() => blockToolbarItems(props.editor, props.format, props.editable, props.undo, props.redo));
const fontScope = useBlockFontScope(props.editor);
const rows = computed(() => {
  const flat = items.value.flatMap(item => item.kind === "group" ? item.children ?? [] : []);
  const primary = ["font", "size", "bold", "italic", "underline", "strike", "link"];
  const secondary = ["growFont", "shrinkFont", "superscript", "subscript", "background", "color", "formatPainter", "copyFormatting", "pasteFormatting", "clearFormatting"];
  return [primary, secondary].map((values, index) => ({ value: String(index), label: index ? "文本操作" : "文字格式", items: values.flatMap(value => flat.filter(item => item.value === value).map(item => ({ ...item, span: value === "font" ? 3.5 : value === "size" ? 2.5 : ["color", "background", "underline"].includes(value) ? 1.5 : 1 }))) }));
});
const links = useBlockLinkScope(props.editor);
/** Routes both fields and native controls through one command path. @param event - Public toolbar intent. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  if (event.item.value === "search") { emit("search"); return; }
  if (event.item.value === "link") { links.open(); return; }
  const value = event.source === "custom" ? event.payload : event.value;
  if (value === "font-settings") { fontScope.dialog.value = true; return; }
  if (typeof value === "string" && value.startsWith("font-target:")) { fontScope.target.value = value.slice(12) as BlockFontTarget; return; }
  if (typeof value !== "string") return;
  const applied = executeBlockToolbarAction(props.editor, value);
  if (value === "copyFormatting") emit("feedback", applied ? "已复制格式。选中目标文字，再点“粘贴格式”" : "当前内容无法复制格式");
  if (value === "pasteFormatting") emit("feedback", applied
    ? props.editor.state.pm.selection.empty ? "格式已用于接下来输入的文字" : "已粘贴格式，可继续应用到其他文字"
    : "格式未改变：目标格式相同或当前内容不允许修改");
}

</script>

<template>
  <QuireToolbar :label="t(selection ? t('文字快捷操作') : t('文档格式'))" variant="elevated" v-bind="selection ? { rows: localize(rows) } : { items: localize(items) }" :renderers="renderers" :context="props"
    :sizing="selection ? 'units' : 'natural'" :align="selection ? 'start' : 'center'" preserve-focus :class="!selection && 'qk-block-editor__format-toolbar'" @execute="execute">
    <template #content="scope">
      <BlockListGallery v-if="scope.item.value === 'bulletList' || scope.item.value === 'orderedList'" :editor="editor"
        :kind="scope.item.value === 'bulletList' ? 'bullet' : 'ordered'" @close="scope.setExpanded(false)" />
    </template>
  </QuireToolbar>
  <FontDialog v-if="!selection" :editor="editor" :format="format" :editable="editable" :undo="undo" :redo="redo" />
</template>
