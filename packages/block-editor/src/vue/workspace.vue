<script setup lang="ts">
import { useBlockLocale } from "./localization/use-locale";
import "@quirekit/whiteboard-editor/styles.css";
import "@quirekit/mind-editor/styles.css";
import "@quirekit/flow-editor/styles.css";
import { EditorUIFloatingPanel, provideEditorUIOverlayHost } from "@quirekit/editor-ui/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { createTheme, quireIconRegistry } from "@quirekit/ui";
import { createQuireKitToaster, QuireToaster, provideQuireOverlayHost, QuireOverlayProvider, QuireButton, QuireIcon, QuireIconButton, QuireIconProvider, QuireThemeProvider, QuireMenu, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent, useQuireKitLocale } from "@quirekit/ui/vue";
import type { BlockEditorProps, BlockEditorSlots } from "./types";
import { useBlockEditorState } from "./use-editor-state";
import { useBlockLinks } from "./outline/use-block-links";
import { useReadingOutline } from "./outline/use-reading";
import BlockLanguage from "./localization/language.vue";
import BlockMediaTools from "./media/host.vue";
import BlockSearch from "./search/panel.vue";
import BlockRail from "./blocks/rail.vue";
import BlockMarquee from "./blocks/marquee.vue";
import BlockSlash from "./insert/slash.vue";
import AttachmentMention from "./attachments/mention.vue";
import BlockFiles from "./files/menu.vue";
import BlockToolbar from "./toolbar/toolbar.vue";
import BlockDataViews from "./data-view/host.vue";
import BlockCodeViews from "./code/host.vue";
import BlockQuickToolbar from "./toolbar/quick.vue";
import BlockListMarkerMenu from "./lists/marker-menu.vue";
import BlockRuleToolbar from "./rule/toolbar.vue";
import BlockNoteToolbar from "./notes/toolbar.vue";
import BlockLinks from "./links/host.vue";
import BlockContainers from "./containers/host.vue";
import BlockInlineContentHost from "./inline-content/host.vue";
import BlockMathHost from "./math/host.vue";
import BlockRichContentHost from "./rich-content/host.vue";

const { t, localize } = useBlockLocale();

const props = defineProps<BlockEditorProps>();
defineSlots<BlockEditorSlots>();
const locale = useQuireKitLocale();
const emit = defineEmits<{
  /** Host title update. */
  "update:title": [title: string];
  /** Document changed; content is intentionally not serialized. */
  change: [];
}>();
const { format, headings, outlineOpen, editable, undo, redo, head, statistics, setOutlineOpen, toggleEditable, count, navigate: navigateCaret } =
  useBlockEditorState(props.instance, () => emit("change"));
const host = ref<HTMLElement>();
const viewport = ref<HTMLElement>();
const documentOverlay = ref<HTMLElement>();
const workspaceOverlay = ref<HTMLElement>();
const toaster = createQuireKitToaster({ placement: "bottom-end", duration: 4000, max: 1 });
/** Shows command feedback without changing the document selection. @param message - Result of the explicit toolbar action. */
function showFeedback(message: string): void {
  toaster.remove();
  toaster.create({ description: t(message), type: "info" });
}
provideEditorUIOverlayHost({ host: documentOverlay, viewport });
provideQuireOverlayHost({ target: () => workspaceOverlay.value, strategy: "absolute" });
useBlockLinks(props.instance.editor, showFeedback);
const searchOpen = ref(false);
const replaceOpen = ref(false);
const fullWidth = ref(false);
const focusMode = ref(false);
const reading = useReadingOutline(props.instance.editor, viewport, headings,
  computed(() => !editable.value && outlineOpen.value && !focusMode.value));
/** @param pos - Heading chosen in the visible outline. */
function navigate(pos: number): void {
  if (editable.value) navigateCaret(pos);
  else {
    const id = props.instance.editor.state.doc.nodeAt(pos)?.attrs.blockId;
    if (id) props.instance.editor.commands.navigateBlockLink?.(id);
    reading.navigate(pos);
  }
}
const hasSearch = typeof props.instance.editor.commands.setSearchQuery === "function";
const hasBlocks = typeof props.instance.editor.commands.insertBlockAt === "function";
/** Opens a scoped search panel without intercepting embedded editors or form fields. @param event - Workspace key input. */
function workspaceKey(event: KeyboardEvent): void {
  if (!hasSearch || event.defaultPrevented || event.isComposing || !(event.metaKey || event.ctrlKey)
    || !host.value?.contains(event.target as Node) || !props.instance.editor.view.hasFocus()) return;
  const key = event.key.toLowerCase();
  if (key !== "f" && key !== "h") return;
  event.preventDefault(); event.stopPropagation();
  replaceOpen.value = key === "h"; searchOpen.value = true;
}
/** Closes transient highlights and returns to the existing document selection. */
function closeSearch(): void { searchOpen.value = false; props.instance.editor.commands.focus(); }
/**
 * Makes blank space below the document continue the canonical text input.
 * @param event - A direct pointer press on product-owned blank space.
 */
function focusDocumentEnd(event: PointerEvent): void {
  const editor = props.instance.editor, doc = editor.state.doc;
  if (!editor.isEditable || !host.value || event.defaultPrevented || event.button !== 0
    || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
  const last = doc.lastChild;
  const element = last && editor.view.nodeDOM?.(doc.content.size - last.nodeSize);
  if (!last || !(element instanceof HTMLElement)) return;
  // Only the text column below its final block belongs to continuation. The
  // mounted View and embedded controls retain all other pointer ownership.
  const column = host.value.getBoundingClientRect();
  if (event.clientX < column.left || event.clientX > column.right
    || event.clientY < element.getBoundingClientRect().bottom) return;
  event.preventDefault();
  if (last.type.name === "paragraph") editor.commands.focus("end");
  else editor.chain().closeHistory().insertContentAt(doc.content.size, { type: "paragraph" }).focus("end").run();
}
const dark = ref(false);
const theme = computed(() => createTheme({ scheme: dark.value ? "dark" : "light" }));
const currentHeading = computed(() => editable.value
  ? headings.value.reduce<number | undefined>((current, item) => item.pos <= head.value ? item.pos : current, undefined)
  : reading.current.value);
const shell = ref<HTMLElement>();
let resize: ResizeObserver | undefined;
let wide: boolean | undefined;
/**
 * Opens the outline when the workspace itself is wide and closes it when it becomes narrow; embedded
 * hosts are measured by their own box, not the window.
 * @param width - Current workspace width in CSS pixels.
 */
function syncWidth(width: number): void {
  const next = width >= 900;
  if (next === wide) return;
  if (wide === undefined || !next) setOutlineOpen(next);
  wide = next;
}
onMounted(() => {
  props.instance.mount(host.value!);
  syncWidth(shell.value!.getBoundingClientRect().width);
  resize = new ResizeObserver(([entry]) => { if (entry) syncWidth(entry.contentRect.width); });
  resize.observe(shell.value!);
});
onBeforeUnmount(() => { toaster.remove(); resize?.disconnect(); props.instance.unmount(); });
</script>

<template>
  <QuireThemeProvider :theme="theme">
    <QuireIconProvider :registry="quireIconRegistry">
      <BlockInlineContentHost :editor="instance.editor" />
      <BlockMathHost :editor="instance.editor" />
      <BlockRichContentHost :editor="instance.editor" :editable="editable" />
      <QuireOverlayProvider :target="documentOverlay" strategy="absolute">
        <BlockDataViews :editor="instance.editor" />
        <BlockCodeViews :editor="instance.editor" />
        <BlockContainers :editor="instance.editor" :editable="editable" />
      </QuireOverlayProvider>
      <section ref="shell" :lang="locale" class="qk-block-editor qk-type-body" :data-editable="editable" :class="{ 'is-full-width': fullWidth, 'is-focus-mode': focusMode }" @keydown="workspaceKey" :aria-label="t('Block Editor 文档工作区')">
        <header class="qk-block-editor__header">
          <div class="qk-block-editor__identity">
            <QuireIconButton :label="t('切换目录')" variant="ghost" :aria-expanded="outlineOpen" @click="setOutlineOpen(!outlineOpen)"><QuireIcon name="listTree" /></QuireIconButton>
            <!-- QuireKit mark shared with Classic and the website: Q shell, ruled lines and quill on the brand tile. -->
            <span class="qk-block-editor__brand" aria-hidden="true"><svg viewBox="0 0 13 13" focusable="false">
              <g fill="none" stroke="currentColor" stroke-width=".5" stroke-linecap="round" opacity=".58"><line x1="4.15" y1="4.75" x2="7.45" y2="4.75" /><line x1="4.15" y1="6.75" x2="6.7" y2="6.75" /></g>
              <path d="M2.15 2.15H7.7a2.25 2.25 0 0 1 2.25 2.25v5.55H4.4a2.25 2.25 0 0 1-2.25-2.25v-5.55Z" fill="none" stroke="currentColor" stroke-width="1.4" />
              <g transform="translate(9.45 9.4) scale(.4) translate(-23.2 -21.25)"><path d="M23.2 21.25c.9-1.1 1.9-1.05 2.6-.5l-.35.8c.8-.25 1.55.25 1.85 1l-.55.3c.75.35 1.25 1.3 1.6 2.95-1.2-.15-2.1-.5-2.8-1.05l.35-.5c-.8-.05-1.5-.5-1.85-1.1l.45-.33c-.75-.27-1.25-.87-1.3-1.57Z" fill="currentColor" /></g>
            </svg></span>
            <span class="qk-block-editor__product">QuireKit <span>Block</span></span>
            <span class="qk-block-editor__header-divider">/</span>
            <span class="qk-block-editor__filename">{{ title || t('未命名文档') }}</span>
          </div>
          <div class="qk-block-editor__actions">
            <QuireIconButton :label="t(dark ? '切换浅色' : '切换深色')" variant="ghost" @click="dark = !dark"><QuireIcon :name="dark ? 'sun' : 'moon'" /></QuireIconButton>
            <QuireTooltipRoot placement="bottom">
              <QuireTooltipTrigger as-child>
                <QuireIconButton :label="t(editable ? '编辑模式' : '只读模式')" size="sm" variant="ghost" @click="toggleEditable"><QuireIcon :name="editable ? 'edit' : 'bookOpen'" /></QuireIconButton>
              </QuireTooltipTrigger>
              <QuireTooltipContent :content="`${t(editable ? '编辑模式' : '只读模式')} · ${t(editable ? '切换为只读' : '切换为编辑')}`" />
            </QuireTooltipRoot>
            <QuireMenu :items="localize([{ value: 'width', label: fullWidth ? t('标准宽度') : t('宽版'), icon: 'expand' }, { value: 'focus', label: focusMode ? t('退出专注') : t('专注模式'), icon: 'scan' }])"
              @select="value => { if (value === 'width') fullWidth = !fullWidth; if (value === 'focus') focusMode = !focusMode; }">
              <template #trigger><QuireIconButton :label="t('文档视图')" variant="ghost"><QuireIcon name="slidersHorizontal" /></QuireIconButton></template>
            </QuireMenu>
            <slot name="header-actions" />
            <BlockFiles :editor="instance.editor" :title="title" :editable="editable" @title="emit('update:title', $event)" @feedback="showFeedback" />
            <BlockLanguage :instance="instance" />
          </div>
        </header>
        <div v-show="!focusMode" class="qk-block-editor__toolbar">
          <BlockToolbar :editor="instance.editor" :format="format" :editable="editable" :undo="undo" :redo="redo" @search="searchOpen = !searchOpen; replaceOpen = true" @feedback="showFeedback" />
        </div>
        <EditorUIFloatingPanel v-if="shell && viewport && hasSearch" :open="searchOpen" :root="shell" :viewport="viewport"
          :title="t('查找替换')" :close-label="t('关闭查找')" @close="closeSearch">
          <BlockSearch :editor="instance.editor" :editable="editable" :replace="replaceOpen" />
        </EditorUIFloatingPanel>
        <BlockSlash v-if="host" :editor="instance.editor" :root="host" />
        <AttachmentMention v-if="host" :editor="instance.editor" :root="host" />
        <BlockLinks v-if="host" :editor="instance.editor" :root="host" :editable="editable" />
        <BlockListMarkerMenu v-if="host" :editor="instance.editor" :root="host" :editable="editable" />
        <div class="qk-block-editor__workspace" :class="{ 'is-outline-open': outlineOpen }">
          <aside v-if="outlineOpen" class="qk-block-editor__outline" :aria-label="t('文档目录')">
            <div class="qk-block-editor__outline-label">{{ t("文档目录") }}<QuireIconButton :label="t('收起目录')" size="xs" variant="ghost" @click="setOutlineOpen(false)"><QuireIcon name="close" /></QuireIconButton></div>
            <nav :aria-label="t('章节')">
              <QuireButton v-for="item in headings" :key="item.pos" variant="ghost" class="qk-block-editor__outline-item"
                :style="{ paddingInlineStart: `${12 + (item.level - 1) * 12}px` }" :aria-current="currentHeading === item.pos ? 'location' : undefined"
                @click="navigate(item.pos)">{{ item.node.textContent || t('未命名标题') }}</QuireButton>
              <p v-if="!headings.length" class="qk-block-editor__empty-outline">{{ t("添加标题后，章节会显示在这里") }}</p>
            </nav>
          </aside>
          <main ref="viewport" class="qk-block-editor__scrollport" @pointerdown.self="focusDocumentEnd">
            <div class="qk-block-editor__scroll-content" @pointerdown.self="focusDocumentEnd">
            <article class="qk-block-editor__document" @pointerdown.self="focusDocumentEnd">
              <div class="qk-block-editor__document-label qk-type-helper"><QuireIcon name="fileText" :size="16" /> {{ t("文档") }}</div>
              <input class="qk-block-editor__title qk-type-page-title" :aria-label="t('文档标题')" :value="title" :placeholder="t('未命名文档')" :readonly="!editable"
                @input="emit('update:title', ($event.target as HTMLInputElement).value)" />
              <div class="qk-block-editor__subtitle qk-type-helper">{{ editable ? t('让想法自然展开。输入 / 插入内容块。') : t('阅读模式 · 内容已锁定') }}</div>
              <div ref="host" class="qk-block-editor__content qk-prose qk-prose--compact" @pointerdown.self="focusDocumentEnd" />
            </article>
            <div ref="documentOverlay" class="qk-block-editor__document-overlays" data-block-document-overlays />
            </div>
            <BlockRail v-if="viewport && hasBlocks && editable" :editor="instance.editor" :viewport="viewport" @feedback="showFeedback" />
            <BlockMarquee v-if="viewport && hasBlocks" :editor="instance.editor" :viewport="viewport" />
          </main>
          <BlockMediaTools v-if="viewport" :editor="instance.editor" :viewport="viewport" :editable="editable" />
          <BlockRuleToolbar v-if="viewport" :editor="instance.editor" />
          <BlockNoteToolbar v-if="viewport" :editor="instance.editor" />
          <BlockQuickToolbar v-if="viewport" :editor="instance.editor" :viewport="viewport" :format="format" :editable="editable" :undo="undo" :redo="redo" @feedback="showFeedback" />
          <slot v-if="viewport" name="tools" :editor="instance.editor" :editable="editable" :viewport="viewport" />
        </div>
        <div ref="workspaceOverlay" class="qk-block-editor__workspace-overlays" data-block-workspace-overlays />
        <Teleport v-if="workspaceOverlay" :to="workspaceOverlay"><QuireToaster :toaster="toaster" /></Teleport>
        <footer class="qk-block-editor__footer">
          <span>{{ editable ? t('选中文字，开始排版') : t('只读') }}</span>
          <QuireButton size="xs" variant="ghost" @click="count">{{ statistics || t('字数统计') }}</QuireButton>
        </footer>
      </section>
    </QuireIconProvider>
  </QuireThemeProvider>
</template>
