<script setup lang="ts">
import { useBlockLocale } from "@quirekit/block-editor/vue";
import { computed } from "vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireMenu } from "@quirekit/ui/vue";
import { tableToolbarItems } from "../ui/catalog";
import { executeTableAction } from "../ui/actions";
import type { BlockTableAction } from "../ui/types";
import { distributeBlockTable } from "../chrome/distribute";
import type { Editor, QuireMountedTableChromeModel } from "@quirekit/core";
import { useEditorUIOverlayHost, EditorUITableChrome, createEditorUITableRailBackground, type EditorUITableAxis } from "@quirekit/editor-ui/vue";
import { insertTableBoundary, moveTableAxis, resizeTableAxis } from "../chrome/commands";
import { selectTableBar, tableBarSelected, tableMoveSource } from "../chrome/selection";
import type { BlockTableTarget } from "../ui/types";

const { t, localize, locale: productLocale } = useBlockLocale();
const locale = computed(() => productLocale.value);
const props = defineProps<{
 /** Canonical command and history owner. */
 editor: Editor;
 /** Exact source document and table retained for each action. */
 target: BlockTableTarget;
 /** Client geometry and unscaled source sizes for hit testing. */
 model: QuireMountedTableChromeModel;
 /** Same geometry projected into the scrolling viewport. */
 scrollModel: QuireMountedTableChromeModel;
 /** Scroll container that owns the teleported controls. */
 viewport: HTMLElement;
 /** Invalidates in-flight gestures when document or viewport changes. */
 identity: number;
 /** Whether canonical selection owns the rail presentation. */
 selectionOwned: boolean;
}>();
const overlays = useEditorUIOverlayHost();
const fragment = computed(() => props.scrollModel.fragments[0]!);
const menu = computed(() => tableToolbarItems(props.editor, props.target).flatMap<QuireKitMenuEntry>(item => {
 const action = { value: item.value, label: item.label, icon: item.icon ?? "moreHorizontal", disabled: item.disabled === true };
 return item.kind === "menu" ? [{ ...action, kind: "submenu", children: item.items ?? [] }]
  : item.kind === "separator" ? [{ value: item.value, label: "", kind: "separator" }] : item.kind === "custom" ? [] : [action];
}));
/** @param value - Exact-target action chosen from the corner menu. */
function execute(value: string | number): void {
 if (value === "distributeRows" || value === "distributeColumns") distributeBlockTable(props.editor, props.target, props.model, value === "distributeRows" ? "row" : "column");
 else executeTableAction(props.editor, props.target, String(value) as BlockTableAction);
 props.editor.commands.focus();
}
/** @param mode - Control kind. @param index - Source index. @returns Canonical structural coverage. */
function selected(mode: EditorUITableAxis | "table", index?: number): boolean { return tableBarSelected(props.editor, props.target, mode, index); }
/** @param axis - Axis. @param index - Source index. @returns Whether current cell crosses this track. */
function current(axis: EditorUITableAxis, index?: number): boolean {
 const rect = props.target.rect, start = axis === "row" ? rect.startRow : rect.startColumn, span = axis === "row" ? rect.rowSpan : rect.columnSpan;
 return index !== undefined && index >= start && index < start + span;
}
/** @param axis - Axis. @returns Shared gradient using canonical source coverage. */
function background(axis: EditorUITableAxis): string {
 const value = fragment.value;
 return createEditorUITableRailBackground(axis === "row" ? value.rows : value.columns, axis, axis === "row" ? value.tableRect.top : value.tableRect.left,
 index => selected(axis, index) ? "selected" : current(axis, index) ? props.selectionOwned ? "current" : "hover" : "idle");
}
</script>
<template>
 <EditorUITableChrome :fragment="fragment" :sizing="model.sizing" :hit-fragment="model.fragments[0]!" :teleport-target="overlays?.host.value ?? viewport"
  :interaction-root="viewport" :owner-document="viewport.ownerDocument" :theme-root="viewport" :identity="identity" :locale="locale" :selection-owned="selectionOwned"
  :row-index="target.rect.startRow" :column-index="target.rect.startColumn" :row-background="background('row')" :column-background="background('column')"
  :selected="selected" :current="current" :move-source="axis => tableMoveSource(editor, target, axis)"
  @select="(mode, index, extend) => selectTableBar(editor, target, mode, index, extend)"
  @insert="insertTableBoundary(editor, target, $event)" @resize="resizeTableAxis(editor, target, model, $event)" @move="moveTableAxis(editor, target, $event)">
  <template #corner="{ selected: covered, activate }">
   <QuireMenu v-bind="overlays?.host.value ? { portalTarget: overlays.host.value } : {}" :items="localize(menu)" @select="execute">
    <template #trigger><button type="button" class="qk-editor-table__corner" data-table-bar="table" :aria-label="t('选择整表')" :aria-pressed="covered" @pointerdown.prevent.stop @click.capture="activate" /></template>
   </QuireMenu>
  </template>
 </EditorUITableChrome>
</template>
