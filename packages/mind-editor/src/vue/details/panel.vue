<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIcon, QuireIconButton, QuireInput, QuireSelect, QuireTextarea } from "@quirekit/ui/vue";
import { readMindMapLink, type MindMapDetailsPatch, type MindMapTopicDetails } from "@quirekit/mind-map";
import { readMindEditorImage } from "../../ui/image";
import type { MindEditorDetailsProps, MindEditorDetailRequest } from "./types";
import FeedbackDialog from "../feedback/dialog.vue";
const { t, failure } = useMindEditorMessages();
const props = defineProps<MindEditorDetailsProps>();
const emit = defineEmits<{ /** Closes this content consumer. */ close: []; /** Workspace draft failure. */ error: [reason: unknown] }>();
const panel = ref<HTMLElement>();
let feedbackTarget: HTMLElement | null = null;
const details = shallowRef<MindMapTopicDetails | null>(null), fileInput = ref<HTMLInputElement>();
const link = ref(""), note = ref(""), marker = ref("none"), message = ref(""), uploading = ref(false);
const disabled = computed(() => props.state.readOnly || props.state.busy || props.state.composing);
const single = computed(() => props.state.selectedCount === 1);
const markers = computed(() => [{ value: "none", label: t("noMarker") }, ...[1, 2, 3].map(value => ({ value: `priority-${value}`, label: t("priority", { value }) }))]);
const imageSizes = computed(() => [...new Set([128, 192, 256, 384, 512, details.value?.image?.width ?? 256])]
  .filter(width => !details.value?.image || width * details.value.image.height / details.value.image.width <= 512)
  .sort((a, b) => a - b).map(width => ({ value: String(width), label: `${width} px` })));
let currentId: string | null = null, generation = 0;
watch([() => props.editor, () => props.version, () => props.draftVersion, () => props.state.selectionVersion, () => props.state.busy, () => props.state.composing], () => {
  if (props.state.busy || props.state.composing) return;
  const changed = currentId !== props.state.selectedId || !single.value;
  if (changed) { currentId = props.state.selectedId; generation++; message.value = ""; }
  details.value = props.editor.getDetails();
  const patch = currentId ? props.drafts.readDetails(currentId) : {};
  link.value = ("link" in patch ? patch.link : details.value?.link) ?? "";
  note.value = ("note" in patch ? patch.note : details.value?.note) ?? "";
  marker.value = ("marker" in patch ? patch.marker : details.value?.marker) ?? "none";
}, { immediate: true });
onBeforeUnmount(() => { generation++; });

// Menu close and panel mount settle before focusing the requested field. A new
// request does not remount this form or discard edits in its other fields.
let handledRequest: MindEditorDetailRequest | null = null;
watch([() => props.request, disabled], async ([request]) => {
  if (!request || request === handledRequest || disabled.value) return;
  await nextTick();
  if (request !== props.request || request === handledRequest || !panel.value?.isConnected || disabled.value) return;
  handledRequest = request;
  if (request.field === "image") fileInput.value?.click();
  else {
    const field = panel.value.querySelector<HTMLElement>(`[data-mind-field="${request.field}"]`);
    (field?.matches("input,textarea,button") ? field : field?.querySelector<HTMLElement>("input,textarea,button"))?.focus({ preventScroll: true });
  }
}, { immediate: true, flush: "post" });

/** @param patch - Explicit content update. @param control - Optional initiating DOM control. @returns Whether the source accepted it. */
async function apply(patch: MindMapDetailsPatch, control?: EventTarget | null): Promise<boolean> {
  if (disabled.value || !props.state.selectedCount) return false;
  captureFocus(control);
  try { await props.editor.setDetails(patch); message.value = ""; return true; }
  catch (reason) { message.value = failure(reason); return false; }
}
/** @param patch - Only the field the user changed, bound to the current selection. */
function stage(patch: MindMapDetailsPatch): void {
  if (!disabled.value) props.drafts.details(props.editor.getSelectedTopicIds(), patch);
}
/** @param event - Actual button intent, even when pointer focus stays on an input. @returns Completion of every captured property form. */
async function save(event: Event): Promise<void> {
  if (disabled.value) return;
  captureFocus(event.currentTarget);
  try { await props.drafts.settled(); message.value = ""; } catch (reason) { message.value = failure(reason); }
}
/** @param value - Explicit display width. @returns Proportional image sizing without replacing its source. */
async function resizeImage(value: string | undefined): Promise<void> {
  const image = details.value?.image, width = Number(value);
  if (!image || !Number.isFinite(width)) return;
  await apply({ image: { ...image, width, height: Math.max(1, Math.round(width * image.height / image.width)) } });
}
/** @param event - Initiating control. Opens only an explicitly validated address after a user gesture. */
function openLink(event: Event): void {
  captureFocus(event.currentTarget);
  try { window.open(readMindMapLink(link.value), "_blank", "noopener,noreferrer"); }
  catch (reason) { message.value = failure(reason); }
}
/** @param event - Explicit local file choice. @returns Completion or harmless abandonment of a stale upload. */
async function upload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = "";
  if (!file || !single.value || disabled.value) return;
  captureFocus();
  const ticket = ++generation, id = props.state.selectedId!, instance = props.editor;
  uploading.value = true;
  try {
    const image = await readMindEditorImage(file, input.ownerDocument);
    if (ticket !== generation || props.state.selectedId !== id || props.editor !== instance) return;
    await instance.setDetails({ image }, [id]); message.value = "";
  } catch (reason) { if (ticket === generation) message.value = failure(reason); }
  finally { uploading.value = false; }
}
/** @param control - Explicit click source; keyboard/input operations fall back to active focus. */
function captureFocus(control?: EventTarget | null): void {
  feedbackTarget = control instanceof HTMLElement ? control : panel.value?.ownerDocument.activeElement as HTMLElement | null;
}
/** @returns The still-mounted initiating control after the error closes. */
function feedbackFocus(): HTMLElement | null {
  return feedbackTarget?.isConnected ? feedbackTarget : panel.value ?? null;
}
/** @param event - Panel keys; composition retains its native ownership. */
function keydown(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key === "Escape" && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); emit("close"); }
}
</script>

<template>
  <aside ref="panel" class="qk-mind-editor__formatting" :aria-label="t('details')" @keydown="keydown">
    <header class="qk-mind-editor__outline-header"><strong>{{ t('details') }}</strong><QuireIconButton :label="t('closeDetails')" variant="ghost" size="sm" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <p class="qk-mind-editor__outline-note">{{ !state.selectedCount ? t('selectTopics') : single ? t('detailsHint') : t('batchMarkers', { count: state.selectedCount }) }}</p>
    <div class="qk-mind-editor__formatting-fields">
      <template v-if="single">
        <QuireInput data-mind-field="link" v-model="link" :aria-label="t('topicLink')" :placeholder="t('linkPlaceholder')" :read-only="state.readOnly" :disabled="state.busy || state.composing" width="100%" @update:model-value="stage({ link: $event || null })" />
        <QuireButton size="sm" variant="ghost" :disabled="!link || state.composing" @click="openLink">{{ t('openLink') }}</QuireButton>
        <QuireTextarea data-mind-field="note" v-model="note" :aria-label="t('topicNote')" :placeholder="t('addNote')" :rows="5" :maxlength="10000" :read-only="state.readOnly" :disabled="state.busy || state.composing" width="100%" @update:model-value="stage({ note: $event || null })" />
      </template>
      <QuireSelect data-mind-field="marker" :label="t('priorityMarker')" :items="markers" :model-value="marker" :disabled="disabled || !state.selectedCount" width="100%" @value-change="stage({ marker: !$event || $event === 'none' ? null : $event as NonNullable<MindMapTopicDetails['marker']> })" />
      <QuireButton :disabled="disabled || !state.selectedCount" size="sm" @click="save">{{ single ? t('applyDetails') : t('applySelection') }}</QuireButton>
      <template v-if="single">
        <img v-if="details?.image" :src="details.image.dataUrl" :alt="details.image.alt" class="qk-mind-editor__topic-image" />
        <QuireSelect v-if="details?.image" :label="t('imageWidth')" :items="imageSizes" :model-value="String(details.image.width)" :disabled="disabled" width="100%" @value-change="resizeImage" />
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="upload" />
        <QuireButton size="sm" variant="outline" :disabled="disabled || uploading" @click="fileInput?.click()">{{ uploading ? t('readingImage') : details?.image ? t('replaceImage') : t('addImage') }}</QuireButton>
        <QuireButton v-if="details?.image" size="sm" variant="ghost" :disabled="disabled" @click="apply({ image: null }, $event.currentTarget)">{{ t('removeImage') }}</QuireButton>
      </template>
      <FeedbackDialog :message="message" :final-focus-el="feedbackFocus" @close="message = ''" />
    </div>
  </aside>
</template>
