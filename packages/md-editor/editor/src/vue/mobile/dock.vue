<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import { QuireToolbar, QuireTaskPanel, QuireActionDirectory, QuirePopoverRoot, QuirePopoverAnchor, QuirePopoverContent } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { sourceInputElement, type MsfeEditor, type SourceAnchor, type MsfeTarget } from "@quirekit/msfe-core";
import { EditorView } from "@quirekit/cm-view";
import type { EditorState } from "@quirekit/cm-state";
import type { MdEditorLocale } from "../types";
import type { MdMentionSource } from "../../commands/types";
import type { MdDialogKind } from "../dialogs/types";
import type { MdFileMode } from "../files/types";
import type { MdExporter } from "../../export/types";
import { mdEditorMessages } from "../messages";
import { toolbarItems, toolbarHistoryItems } from "../toolbar/configuration";
import { runToolbarAction } from "../toolbar/actions";
import { formattingRejected } from "../toolbar/availability";
import { dispatchChromeIntent } from "../toolbar/intent";
import { mobileActionDirectory, mobileTableToolbar } from "./catalog";
import { useMobileViewport } from "./viewport";
import { useMdOverlayTarget } from "../overlays/context";
import { mobileSelectionActions, selectMobileRange } from "./ranges";
import { useMobileTaskContext } from "./context";
import { mobileFloatingPopoverStyle } from "./controls";
import Insertion from "./insertion.vue";
import type { MdBlockInsertionRequest } from "../blocks/insertion/types";
const props = defineProps<{
  /** Canonical source owner. */ editor: MsfeEditor;
  /** Accepted current state. */ state: EditorState;
  /** Shared product language. */ locale: MdEditorLocale;
  /** Document layout explicitly admits fixed bottom chrome. */ fixed: boolean;
  /** Responsive consumer visibility. */ visible: boolean;
  /** Explicit product root, including embedded instances. */ root: HTMLElement | null;
  /** Host-installed Word capability. */ docx?: boolean;
  /** Host-installed format exporters. */ exporters?: readonly MdExporter[];
  /** Installed library label. */ templateName?: string | undefined;
  /** Optional contacts. */ mentions?: MdMentionSource | undefined;
}>();
const emit = defineEmits<{
  /** Existing shared source editor. */ edit: [kind: MdDialogKind, target?: MsfeTarget, body?: string];
  /** Deferred insertion beside the original table or code block. */ insert: [request: MdBlockInsertionRequest];
  /** Existing file protocol. */ file: [mode: MdFileMode, exporter?: string];
  /** Installed template workspace. */ template: [];
  /** Show the comment list. */ comments: [];
}>();
const text = computed(() => mdEditorMessages[props.locale]), bar = shallowRef<HTMLElement | null>(null), root = computed(() => props.root), portal = useMdOverlayTarget();
const style = useMobileViewport(root as Ref<HTMLElement | null>, bar, computed(() => props.visible && props.fixed));
const panel = ref(""), list = ref(false), insertion = ref(false), initial = ref(""), button = shallowRef<HTMLElement | null>(null), target = shallowRef<SourceAnchor>();
const revision = shallowRef(0), listPoint = shallowRef({ left: "0px", top: "0px" });
const handoff = ref(false), changed = ref(false);
const feedback = ref("");
watch(() => props.state, () => { feedback.value = ""; });
const insertionSurface = shallowRef<HTMLElement | null>(null), panelSurface = shallowRef<HTMLElement | null>(null);
const overflowOpen = ref(false), overflowSurface = shallowRef<HTMLElement | null>(null);
const taskSurface = computed(() => insertion.value ? insertionSurface.value : panel.value ? panelSurface.value : overflowSurface.value);
useMobileTaskContext(computed(() => props.editor), computed(() => props.state), taskSurface, root, computed(() => props.fixed));
let scope = props.editor.documentScope;
/** @returns The raw owner-local chrome element without proxying its DOM identity. */
function getElement(): HTMLElement | null { return bar.value; }
/** @returns Only the current task's physical obstruction; exiting siblings cannot retarget it. */
function getTaskElement(): HTMLElement | null { return taskSurface.value; }
defineExpose({ getElement, getTaskElement, active: computed(() => !!panel.value || list.value || insertion.value || overflowOpen.value) });
watch([() => props.editor, () => props.visible], ([editor, visible], _old, cleanup) => { if (visible) cleanup(editor.history.subscribe(() => revision.value++)); }, { immediate: true });
const entries = computed(() => { void props.state; void revision.value; if (!props.visible && !panel.value && !list.value) return []; return toolbarItems(props.editor, props.locale, props.docx !== false, props.templateName, props.exporters); });
const formats = computed(() => (entries.value.find(entry => entry.value === "format")?.children ?? []));
const headings = computed<readonly QuireKitToolbarEntry[]>(() => {
  const heading = entries.value.find(entry => entry.value === "heading");
  return ["paragraph", "h1", "h2", "h3", "h4", "h5", "h6"].map((key, index) => ({ value: `heading-${index}`, label: text.value[key as "h1"], text: index ? `H${index}` : text.value.paragraph, kind: "toggle", pressed: heading?.payload === `heading-${index}`, disabled: heading?.disabled ?? true }));
});
const lists = computed(() => entries.value.find(entry => entry.value === "blocks")?.children ?? []);
const selections = computed(() => { void props.state; return panel.value ? mobileSelectionActions(props.editor, target.value?.target(), props.locale) : []; });
const files = computed(() => panel.value === "files" ? mobileActionDirectory(entries.value.find(entry => entry.value === "files")?.items ?? []) : []);
const selectionTools = computed<readonly QuireKitToolbarEntry[]>(() => selections.value.map(action => ({ value: action.value, label: action.label, text: action.label, disabled: !!action.disabled })));
const dock = computed<readonly QuireKitToolbarEntry[]>(() => { void props.state; void revision.value; return [
  ...(props.visible ? toolbarHistoryItems(props.editor, props.locale).children ?? [] : []),
  { value: "insert", label: text.value.insert, icon: "plus", disabled: props.state.readOnly },
  { value: "format", label: text.value.heading, icon: "type", disabled: props.state.readOnly },
  { value: "list", label: text.value.blocks, icon: "listBullet", disabled: props.state.readOnly },
  { value: "files", label: text.value.importExport, icon: "arrowUpDown" },
  ...(entries.value.some(entry => entry.value === "comments" && !entry.hidden) ? [{ value: "comments", label: text.value.comments, icon: "messageSquare" }] : []),
  ...mobileTableToolbar(entries.value.find(entry => entry.value === "table-actions")),
]; });
onBeforeUnmount(() => target.value?.release());
watch(() => props.state, () => { if (scope !== props.editor.documentScope || props.editor.mode === "locked" || props.editor.state.readOnly && (panel.value === "format" || list.value || insertion.value)) close(); });
/** Ends the one chrome task and its retained source intent. */
function close(): void { panel.value = ""; list.value = false; insertion.value = false; target.value?.release(); target.value = undefined; }
/** @param open - Effective overflow session. @param trigger - Stable row entry, captured before modal focus. */
function overflowChanged(open: boolean, trigger: HTMLElement | null): void {
  overflowOpen.value = open;
  if (open) { close(); button.value = trigger; handoff.value = false; changed.value = false; scope = props.editor.documentScope; target.value = props.editor.captureAnchor(props.editor.state.selection.main); }
  else if (!panel.value && !insertion.value && !list.value) { target.value?.release(); target.value = undefined; }
}
/** @param element - Actual physical obstruction; input resumes after the old modal has exited. */
function overflowMounted(element: HTMLElement | null): void {
  overflowSurface.value = element;
  if (!element && handoff.value && !panel.value && !insertion.value && !list.value && scope === props.editor.documentScope && !props.editor.scope.disposed) props.editor.focus();
}
/** @param event - Bottom entry retains focus through the public toolbar. */
function open(event: QuireKitToolbarExecuteEvent): void {
  if (event.value === "undo" || event.value === "redo") { close(); runToolbarAction(props.editor, event.value, props.locale); return; }
  if (event.value === "comments") { close(); emit("comments"); return; }
  if (!["insert", "image", "list", "format", "files"].includes(event.value)) {
    const captured = overflowOpen.value ? target.value?.target() : props.editor.captureTarget();
    if (!captured) return;
    handoff.value = true; action(event.value, captured); close(); return;
  }
  const element = event.nativeEvent?.target as HTMLElement | null;
  if (!overflowOpen.value) button.value = element?.closest("button") ?? bar.value;
  const saved = overflowOpen.value ? target.value : undefined;
  if (saved) { panel.value = ""; list.value = false; insertion.value = false; } else close();
  handoff.value = overflowOpen.value; changed.value = false; scope = props.editor.documentScope; target.value = saved ?? props.editor.captureAnchor(props.editor.state.selection.main);
  if (event.value === "insert" || event.value === "image") { initial.value = event.value === "image" ? "image" : ""; insertion.value = true; }
  else if (event.value === "list") {
    const rect = button.value?.getBoundingClientRect();
    listPoint.value = { left: `${rect?.left ?? 0}px`, top: `${rect?.top ?? 0}px` }; list.value = true;
  }
  else panel.value = event.value;
}
/** @param value - Original command identity. @param captured - Latest validated original source target. */
function action(value: string, captured: MsfeTarget): void {
  dispatchChromeIntent(props.editor, value, props.locale, captured, { edit: (...args) => emit("edit", ...args), file: (...args) => emit("file", ...args), template: () => emit("template") });
}
/** @param event - Continuous format operation or instantaneous list change. */
function format(event: QuireKitToolbarExecuteEvent): void {
  const captured = target.value?.target(); if (!captured) return;
  const previous = props.editor.revision;
  feedback.value = runToolbarAction(props.editor, event.value, props.locale, captured) === false ? formattingRejected(props.locale) : "";
  changed.value ||= props.editor.revision !== previous;
  target.value?.release(); target.value = props.editor.captureAnchor(props.editor.state.selection.main);
  if (list.value) { close(); props.editor.focus(); }
}
/** @param value - Active directory action; navigation performs no document mutation. */
function select(value: string): void {
  const captured = target.value?.target(); if (!captured) return;
  if (value === "select-all" || value === "select-block") {
    if (!selectMobileRange(props.editor, captured, value)) return;
    target.value?.release(); target.value = props.editor.captureAnchor(props.editor.state.selection.main);
    changed.value = true;
    return;
  }
  handoff.value = true; action(value, captured); close();
}
/** @returns Accepted formatting restores input; untouched browsing returns to its entry. */
function finalFocus(): HTMLElement | null {
  const view = EditorView.findFromDOM(props.editor.element);
  return changed.value && view ? sourceInputElement(view) : button.value;
}
</script>
<template>
  <div v-show="visible" ref="bar" class="md-mobile-dock" :data-fixed="fixed" :style="fixed ? style : undefined" data-md-mobile-dock data-qk-not-prose>
    <QuireToolbar :label="text.toolbar" :items="dock" mode="mobile" align="center" variant="plain" preserve-focus :overflow-portal-target="portal ?? 'body'" :overflow-restore-focus="!handoff" @execute="open" @overflow-open-change="overflowChanged" @overflow-content-element-change="overflowMounted" />
  </div>
  <Insertion :editor="editor" :state="state" :locale="locale" :open="insertion" :mentions="mentions" :initial="initial" :anchor-el="() => button" @surface="insertionSurface = $event" @update:open="!$event && close()" @action="action" @insert="emit('insert', $event)" />
  <QuireTaskPanel :open="!!panel" :title="panel === 'format' ? text.format : text.importExport" presentation="bottom" :anchor-el="() => button" :portal-target="portal ?? 'body'" :restore-focus="!handoff" :final-focus-el="finalFocus" @content-element-change="panelSurface = $event" @update:open="!$event && close()">
    <template v-if="panel === 'format'">
      <QuireToolbar :label="text.selection" :items="selectionTools" mode="mobile" variant="plain" overflow="visible" preserve-focus @execute="select($event.value)" />
      <QuireToolbar v-for="(row, i) in [formats.slice(0, 4), formats.slice(4)]" :key="i" :label="`${text.format} ${i + 1}`" :items="row" mode="mobile" variant="plain" align="center" overflow="visible" preserve-focus @execute="format" />
      <QuireToolbar v-for="(row, i) in [headings.slice(0, 4), headings.slice(4)]" :key="`heading-${i}`" :label="`${text.heading} ${i + 1}`" :items="row" mode="mobile" variant="plain" align="center" overflow="visible" preserve-focus @execute="format" />
      <p v-if="feedback" role="status" class="m-0 p-qk-inline qk-type-helper text-qk-text-secondary">{{ feedback }}</p>
    </template>
    <QuireActionDirectory v-else :actions="files" @activate="select" />
  </QuireTaskPanel>
  <QuirePopoverRoot :open="list" placement="top" :restore-focus="false" @update:open="!$event && close()">
    <QuirePopoverAnchor><span class="md-mobile-list-anchor" :style="listPoint" /></QuirePopoverAnchor>
    <QuirePopoverContent v-if="list" :portal-target="portal ?? 'body'" :show-arrow="false" width="auto" padding="none" :style="mobileFloatingPopoverStyle"><QuireToolbar :label="text.blocks" :items="lists" mode="mobile" variant="elevated" overflow="visible" preserve-focus @execute="format" /></QuirePopoverContent>
  </QuirePopoverRoot>
</template>
<style scoped>
.md-mobile-dock { padding: var(--qk-space-inline); padding-bottom: max(var(--qk-space-inline), var(--md-dock-safe-area, env(safe-area-inset-bottom))); background: var(--qk-color-surface-page); box-shadow: 0 -1px 0 var(--qk-color-border-subtle); z-index: var(--qk-layer-chrome); }
.md-mobile-dock[data-fixed=true] { position: fixed; }
.md-mobile-list-anchor { position: fixed; width: 44px; height: 1px; pointer-events: none; }
</style>
