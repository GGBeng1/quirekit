<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { EditorSelection, type EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { sourceInputHasFocus, readSourcePresentation, type MsfeEditor } from "@quirekit/msfe-core";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import { QuirePopoverRoot, QuirePopoverAnchor, QuirePopoverContent, QuireToolbar } from "@quirekit/ui/vue";
import type { MdEditorLocale } from "../types";
import { useMdOverlayTarget } from "../overlays/context";
import { mdEditorMessages } from "../messages";
import { useMobileClipboard } from "./clipboard/use-clipboard";
import ClipboardSurface from "./clipboard/surface.vue";
import { useMobileTaskContext } from "./context";
import { mobileFloatingPopoverStyle } from "./controls";
import { mobileSelectionActionsVisible, selectionActionsEffect } from "../../presentation/mobile/actions";
const props = defineProps<{
  /** Canonical source and native layout owner. */ editor: MsfeEditor;
  /** Accepted selection, without serializing its document. */ state: EditorState;
  /** Product's narrow presentation and absence of a modal task. */ enabled: boolean;
  /** Shared control language. */ locale: MdEditorLocale;
  /** Product instance for existing task clearance. */ root?: HTMLElement | null;
  /** Only document layout has a fixed page-wide task. */ fixed?: boolean;
  /** Offers a comment action for the selection. */ commentable?: boolean;
}>();
const emit = defineEmits<{ /** Open a comment draft for the selection. */ comment: [] }>();
const portal = useMdOverlayTarget(), position = shallowRef<{ left: string; top: string } | null>(null), interacting = shallowRef(false);
const owner = computed(() => props.editor), state = computed(() => props.state);
const clipboard = useMobileClipboard(owner, state, computed(() => props.enabled));
const { busy, fallback } = clipboard, text = computed(() => mdEditorMessages[props.locale]);
const error = computed(() => clipboard.error.value === "empty" ? text.value.clipboardEmpty : clipboard.error.value ? text.value.clipboardFailed : "");
const surface = shallowRef<HTMLElement | null>(null), taskSurface = computed(() => fallback.value ? surface.value : null);
useMobileTaskContext(owner, state, taskSurface, computed(() => props.root ?? null), computed(() => !!props.fixed));
/** @returns Only the active paste task's physical obstruction. */
function getTaskElement(): HTMLElement | null { return taskSurface.value; }
defineExpose({ getTaskElement });
const open = computed(() => props.enabled && !busy.value && !fallback.value && mobileSelectionActionsVisible(props.state) && !interacting.value && !!position.value && !props.state.selection.main.empty);
const items = computed<readonly QuireKitToolbarEntry[]>(() => {
  const { copy, cut, paste, selectAll } = text.value, readonly = props.state.readOnly || props.editor.mode === "locked";
  return [
    { value: "copy", label: copy, text: copy, disabled: busy.value },
    { value: "cut", label: cut, text: cut, disabled: busy.value || readonly },
    { value: "paste", label: paste, text: paste, disabled: busy.value || readonly },
    { value: "all", label: selectAll, text: selectAll, disabled: busy.value },
    ...(props.commentable ? [{ value: "comment", label: text.value.addComment, text: text.value.addComment, disabled: busy.value }] : []),
  ];
});
watch(() => props.editor, (editor, _old, cleanup) => {
  const element = editor.element, doc = element.ownerDocument, win = doc.defaultView!;
  let frame = 0;
  /** Uses only two mounted native endpoints; no text or syntax tree scan. */
  function measure(): void {
    frame = 0;
    const view = EditorView.findFromDOM(element), range = editor.state.selection.main;
    if (!props.enabled || !view || !mobileSelectionActionsVisible(view.state) || range.empty || interacting.value || view.composing || readSourcePresentation(view.state).composing
      || !sourceInputHasFocus(view) && !view.dom.hasAttribute("data-md-mobile-selection")) { position.value = null; return; }
    const visual = win.visualViewport, top = visual?.offsetTop ?? 0, bottom = top + (visual?.height ?? win.innerHeight);
    const endpoints = [range.from, range.to].filter(pos => view.visibleRanges.some(value => pos >= value.from && pos <= value.to))
      .map(pos => view.coordsAtPos(pos)).filter(rect => !!rect && rect.bottom > top + 48 && rect.top < bottom - 64);
    const rect = endpoints[0];
    position.value = rect ? { left: `${rect.left}px`, top: `${rect.top}px` } : null;
  }
  /** Coalesces actual selection, focus and viewport events in the owner's realm. */
  function schedule(): void { if (!frame) frame = win.requestAnimationFrame(measure); }
  /** Hide during native selection and handle gestures, including accepted long holds. */
  function start(): void { interacting.value = true; position.value = null; }
  /** Show only the latest accepted selection after pointer/touch release. */
  function end(): void { interacting.value = false; schedule(); }
  /** @param event - Native menu intent for this instance's resting text selection. */
  function contextMenu(event: MouseEvent): void {
    if (!props.enabled || editor.state.selection.main.empty) return;
    const target = event.target, view = EditorView.findFromDOM(element);
    if (!(target instanceof win.Element) || !view || !sourceInputHasFocus(view) || view.composing || view.compositionStarted || readSourcePresentation(view.state).composing || !view.contentDOM.contains(target)
      || target.closest("button, input, textarea, select, a[href], [role=button], .msfe-node-view, .msfe-component-view, [data-qk-not-prose]")) return;
    // Gesture cancellation ends at release; the custom action owner still owns
    // this range afterward. Suppress the menu without changing its native selection.
    event.preventDefault(); event.stopPropagation();
  }
  element.addEventListener("pointerdown", start, { capture: true }); element.addEventListener("touchstart", start, { capture: true, passive: true });
  element.addEventListener("contextmenu", contextMenu, true);
  doc.addEventListener("pointerup", end); doc.addEventListener("pointercancel", end); doc.addEventListener("touchend", end); doc.addEventListener("touchcancel", end);
  element.addEventListener("focusin", schedule); element.addEventListener("focusout", schedule); element.addEventListener("compositionstart", schedule); element.addEventListener("compositionend", schedule);
  doc.addEventListener("scroll", schedule, { capture: true, passive: true }); win.addEventListener("resize", schedule); win.visualViewport?.addEventListener("resize", schedule); win.visualViewport?.addEventListener("scroll", schedule);
  const stop = watch([() => props.state.selection, () => readSourcePresentation(props.state).composing, () => props.enabled,
    () => mobileSelectionActionsVisible(props.state), () => { void props.state; const view = EditorView.findFromDOM(element); return !!view && sourceInputHasFocus(view); }], schedule, { immediate: true });
  cleanup(() => { stop(); if (frame) win.cancelAnimationFrame(frame);
    element.removeEventListener("pointerdown", start, true); element.removeEventListener("touchstart", start, true);
    element.removeEventListener("contextmenu", contextMenu, true);
    doc.removeEventListener("pointerup", end); doc.removeEventListener("pointercancel", end); doc.removeEventListener("touchend", end); doc.removeEventListener("touchcancel", end);
    element.removeEventListener("focusin", schedule); element.removeEventListener("focusout", schedule); element.removeEventListener("compositionstart", schedule); element.removeEventListener("compositionend", schedule);
    doc.removeEventListener("scroll", schedule, true); win.removeEventListener("resize", schedule); win.visualViewport?.removeEventListener("resize", schedule); win.visualViewport?.removeEventListener("scroll", schedule);
  });
}, { immediate: true });
/** @param event - One selection action retaining the actual native input owner. */
function execute(event: QuireKitToolbarExecuteEvent): void {
  const view = EditorView.findFromDOM(props.editor.element);
  if (!props.enabled || busy.value || !view || view.composing || readSourcePresentation(props.state).composing) return;
  if (event.value === "comment") emit("comment");
  else if (event.value === "all") {
    props.editor.updateViewState({ selection: EditorSelection.single(0, props.editor.state.doc.length), effects: [selectionActionsEffect.of(false)] });
  } else void clipboard.execute(event.value);
}
</script>
<template>
  <QuirePopoverRoot :open="open" placement="top-start" :auto-focus="false" :restore-focus="false" :close-on-interact-outside="false">
    <QuirePopoverAnchor><span class="md-mobile-selection-anchor" :style="position ?? undefined" /></QuirePopoverAnchor>
    <QuirePopoverContent v-if="open" width="auto" padding="none" :style="mobileFloatingPopoverStyle" :show-arrow="false" :portal-target="portal ?? 'body'" class="md-mobile-selection-actions" data-md-selection-actions @contextmenu.prevent>
      <QuireToolbar :label="locale === 'en' ? 'Selection actions' : '选区操作'" :items="items" mode="mobile" variant="elevated" overflow="visible" preserve-focus @execute="execute" />
      <p v-if="error" role="status" class="m-0 mt-qk-inline-tight rounded-qk-control bg-qk-surface-overlay p-qk-inline qk-type-helper text-qk-text-secondary">{{ error }}</p>
    </QuirePopoverContent>
  </QuirePopoverRoot>
  <ClipboardSurface v-if="fallback || surface" :open="fallback" :owner="editor.element" :locale="locale" :error="error" @apply="clipboard.paste" @cancel="clipboard.cancel" @surface="surface = $event" />
</template>
<style scoped>
.md-mobile-selection-anchor { position: fixed; width: 1px; height: 1px; pointer-events: none; }
.md-mobile-selection-actions { -webkit-touch-callout: none; }
</style>
