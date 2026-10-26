<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, watch } from "vue";
import type { EditorState } from "@quirekit/pm";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { EditorUIColorButton } from "@quirekit/editor-ui/vue";
import type { BlockToolbarProps } from "../types";
import { restoreBlockEditorFocus } from "../../ui/focus";

const { t } = useBlockLocale();

const props = defineProps<{ /** Public Toolbar renderer and shared formatting projection. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockToolbarProps);
const background = computed(() => props.scope.item.value === "background");
const value = computed(() => background.value ? context.value.format.background : context.value.format.color);
const draft = ref("#000000"), dirty = ref(false), recent = ref<string[]>([]);
let source: EditorState | null = null;
watch(() => props.scope.expanded, open => { if (open) source = context.value.editor.state.pm; });
watch(value, next => { if (!dirty.value) draft.value = next || (background.value ? "#fef08a" : "#000000"); }, { immediate: true });
/** @returns Whether the original document and selection still own this color popup. */
function current(): boolean {
  const editor = context.value.editor, state = editor.state.pm;
  return editor.isEditable && !!source && state.doc === source.doc && state.selection.eq(source.selection);
}
/** @param next - Local picker draft, without per-keystroke document writes. */
function preview(next: string): void { draft.value = next; dirty.value = true; }
/** @param next - Explicitly committed CSS color. */
function commit(next: string): void {
  dirty.value = false;
  const editor = context.value.editor;
  if (!current()) return;
  const chain = editor.chain();
  const applied = background.value ? chain.setBackgroundColor(next).run() : chain.setColor(next).run();
  if (applied) {
    source = editor.state.pm; restoreBlockEditorFocus(editor);
    recent.value = [next, ...recent.value.filter(color => color !== next)].slice(0, 8);
  }
}
/** Clears direct color through the existing formatting owner. */
function reset(): void {
  dirty.value = false;
  const editor = context.value.editor;
  if (!current()) return;
  const chain = editor.chain();
  if (background.value) chain.unsetBackgroundColor().run(); else chain.unsetColor().run();
  source = editor.state.pm; restoreBlockEditorFocus(editor);
}
/** @param open - Public picker lifecycle. */
function applyCurrent(): void { source = context.value.editor.state.pm; commit(draft.value); }
</script>
<template>
 <EditorUIColorButton :scope="scope" :disclosure-label="t('{label}选项', { label: scope.item.label })" :color="draft" :reset-active="value === ''" :recent-colors="recent"
  :picker-props="{ resetLabel: background ? t('无高亮') : t('默认颜色') }" @action="applyCurrent" @preview="preview" @commit="commit" @reset="reset" />
</template>
