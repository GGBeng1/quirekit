<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorUIAnchoredOverlay, EditorUIObjectToolbar } from "@quirekit/editor-ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { executeNoteAction } from "../../notes/target";
import { useNoteContext } from "./context";

const { t, localize } = useBlockLocale();

const props = defineProps<{ /** Canonical document session. */ editor: Editor }>();
const { target, anchor, measure } = useNoteContext(props.editor);
const items = computed<readonly QuireKitToolbarEntry[]>(() => [
  { value: "navigate", label: target.value?.node.type.name === "footnoteReference" ? "查看脚注" : "返回脚注引用",
    icon: target.value?.node.type.name === "footnoteReference" ? "arrowDownRight" : "arrowUpLeft" },
  { value: "delete", label: "删除脚注及引用", icon: "trash2" }
]);
/** @param value - Public toolbar action bound to the currently displayed footnote. */
function execute(value: string): void {
  if (target.value && (value === "navigate" || value === "delete")) executeNoteAction(props.editor, target.value, value);
}
</script>
<template>
  <EditorUIAnchoredOverlay :show="!!target" :anchor="anchor" :resolve-anchor="measure" placement="top" layer="chrome">
    <EditorUIObjectToolbar v-if="target" :label="t('脚注快捷工具')" :items="localize(items)" @execute="execute($event.value)" />
  </EditorUIAnchoredOverlay>
</template>
