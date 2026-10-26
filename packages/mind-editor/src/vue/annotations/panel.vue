<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { computed, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireColorPicker, QuireIcon, QuireIconButton, QuireInput } from "@quirekit/ui/vue";
import { mindMapAnnotationTopics, type MindMapAnnotation } from "@quirekit/mind-map";
import type { MindEditorAnnotationProps } from "./types";
import { v4 as uuidv4 } from "uuid";
const { t } = useMindEditorMessages();
const props = defineProps<MindEditorAnnotationProps>();
const emit = defineEmits<{ /** Close intent. */ close: []; /** Active command failure. */ error: [reason: unknown] }>();
const entries = shallowRef<readonly MindMapAnnotation[]>([]), ids = shallowRef<readonly string[]>([]);
const currentId = ref(""), text = ref(""), color = ref<string>(), page = ref(0);
const selected = computed(() => entries.value.find(item => item.id === currentId.value));
const unavailable = computed(() => props.state.busy || props.state.composing);
const disabled = computed(() => unavailable.value || props.state.readOnly);
const labels = computed(() => ({ relation: t("relationship"), summary: t("summary"), boundary: t("boundary") }));
watch([() => props.editor, () => props.version, () => props.draftVersion, () => props.state.busy, () => props.state.composing], () => {
  if (unavailable.value) return;
  try {
    entries.value = props.editor.getAnnotations();
    const entry = selected.value ? props.drafts.readAnnotation(currentId.value) ?? selected.value : undefined;
    text.value = entry?.text ?? ""; color.value = entry?.color;
    page.value = Math.min(page.value, Math.max(0, Math.ceil(entries.value.length / 50) - 1));
  } catch (reason) { emit("error", reason); }
}, { immediate: true });
watch([() => props.editor, () => props.state.selectionVersion, () => props.state.busy, () => props.state.composing], () => {
  if (!unavailable.value) ids.value = props.editor.getSelectedTopicIds();
}, { immediate: true });

watch(() => props.selectedId, id => {
  currentId.value = id ?? "";
  const item = selected.value;
  if (item) edit(item);
}, { immediate: true });

/** @param item - Existing object chosen in the list. */
function edit(item: MindMapAnnotation): void {
  currentId.value = item.id; const value = props.drafts.readAnnotation(item.id) ?? item;
  text.value = value.text; color.value = value.color;
}
/** Captures this annotation form without reading or replacing the forest. */
function stage(): void {
  if (!selected.value || disabled.value) return;
  const { color: _color, ...base } = props.drafts.readAnnotation(currentId.value) ?? selected.value;
  props.drafts.annotation({ ...base, text: text.value, ...(color.value ? { color: color.value } : {}) });
}
/** @param kind - Annotation kind. @returns One atomic creation from the current explicit selection. */
async function create(kind: MindMapAnnotation["kind"]): Promise<void> {
  if (disabled.value || !ids.value.length || kind === "relation" && ids.value.length !== 2) return;
  const common = { id: `annotation-${uuidv4()}`, text: labels.value[kind] };
  const item: MindMapAnnotation = kind === "relation" ? { ...common, kind, from: ids.value[0]!, to: ids.value[1]! }
    : { ...common, kind, topicIds: [...ids.value] };
  try { await props.editor.putAnnotation(item); edit(item); } catch (reason) { emit("error", reason); }
}
/** @returns Completion of applying the explicit caption/color form. */
async function save(): Promise<void> {
  if (!selected.value || disabled.value) return;
  try { await props.drafts.settled(); }
  catch (reason) { emit("error", reason); }
}
/** @returns Completion of deleting the selected semantic object only. */
async function remove(): Promise<void> {
  if (!selected.value || disabled.value) return;
  try { await props.editor.removeAnnotation(selected.value.id); currentId.value = ""; } catch (reason) { emit("error", reason); }
}
/** @returns Navigation completion without stealing the property form's focus. */
async function locate(): Promise<void> {
  if (!selected.value || unavailable.value) return;
  try { await props.editor.reveal(mindMapAnnotationTopics(selected.value)[0]!, false); } catch (reason) { emit("error", reason); }
}
/** @param event - Panel-local keys; native IME owns composition keys. */
function keydown(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key === "Escape" && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); emit("close"); }
}
</script>

<template>
  <aside class="qk-mind-editor__formatting" :aria-label="t('annotations')" @keydown="keydown">
    <header class="qk-mind-editor__outline-header"><strong>{{ t('annotations') }}</strong><QuireIconButton :label="t('closeAnnotations')" variant="ghost" size="sm" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <p class="qk-mind-editor__outline-note">{{ t('multiSelectHint', { count: state.selectedCount }) }}</p>
    <div class="qk-mind-editor__annotation-create">
      <QuireButton size="sm" variant="outline" :disabled="disabled || ids.length !== 2" @click="create('relation')">{{ t('addRelationship') }}</QuireButton>
      <QuireButton size="sm" variant="outline" :disabled="disabled || !ids.length" @click="create('summary')">{{ t('addSummary') }}</QuireButton>
      <QuireButton size="sm" variant="outline" :disabled="disabled || !ids.length" @click="create('boundary')">{{ t('addBoundary') }}</QuireButton>
    </div>
    <p class="qk-mind-editor__outline-note">{{ t('annotationHelp') }}</p>
    <div class="qk-mind-editor__outline-scroll">
      <ul class="qk-mind-editor__results">
        <li v-for="entry in entries.slice(page * 50, (page + 1) * 50)" :key="entry.id"><QuireButton variant="ghost" :disabled="unavailable"
          :aria-current="entry.id === currentId ? 'true' : undefined" @click="edit(entry)">{{ labels[entry.kind] }} · {{ entry.text || t('untitled') }}</QuireButton></li>
      </ul>
      <p v-if="!entries.length" class="qk-mind-editor__outline-note">{{ t('emptyAnnotations') }}</p>
    </div>
    <div v-if="entries.length > 50" class="qk-mind-editor__outline-controls"><QuireButton size="sm" variant="ghost" :disabled="!page" @click="page--">{{ t('previousPage') }}</QuireButton><span>{{ page + 1 }} / {{ Math.ceil(entries.length / 50) }}</span><QuireButton size="sm" variant="ghost" :disabled="(page + 1) * 50 >= entries.length" @click="page++">{{ t('nextPage') }}</QuireButton></div>
    <div v-if="selected" class="qk-mind-editor__formatting-fields">
      <QuireInput v-model="text" :aria-label="t('annotationTitle')" :placeholder="t('annotationTitle')" :maxlength="160" :disabled="disabled" width="100%" @update:model-value="stage" />
      <div class="qk-mind-editor__property"><span>{{ t('color') }}</span><QuireColorPicker :label="t('annotationColor')" :model-value="color ?? '#4855ec'" :show-alpha="false" :disabled="disabled" :reset-label="t('resetBlue')" :reset-active="!color" @commit="color = $event; stage()" @reset="color = undefined; stage()" /></div>
      <QuireButton size="sm" :disabled="disabled" @click="save">{{ t('applyAnnotation') }}</QuireButton>
      <div class="qk-mind-editor__outline-controls"><QuireButton size="sm" variant="ghost" :disabled="unavailable" @click="locate">{{ t('locate') }}</QuireButton><QuireButton size="sm" variant="ghost" :disabled="disabled" @click="remove">{{ t('removeAnnotation') }}</QuireButton></div>
    </div>
  </aside>
</template>
