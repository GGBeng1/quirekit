<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIcon, QuireIconButton, QuireInput, QuireTreeView } from "@quirekit/ui/vue";
import type { MindMapOutlineEntry } from "@quirekit/mind-map-simple";
import type { MindEditorNavigationProps } from "./types";
import { findMindEditorTopics, mindEditorOutlineNodes } from "../../ui/outline";

const { t } = useMindEditorMessages();
const props = defineProps<MindEditorNavigationProps>();
const emit = defineEmits<{ /** Closes this transient navigation consumer. */ close: []; /** Reports active-instance failures. */ error: [reason: unknown] }>();
const panel = ref<HTMLElement>(), query = ref(""), page = ref(0), current = ref(-1), note = ref("");
const entries = shallowRef<readonly MindMapOutlineEntry[]>([]), expanded = ref<string[]>([]);
let initialized = false;
const nodes = computed(() => mindEditorOutlineNodes(entries.value, t));
const selected = computed(() => props.state.selectedCount === 1 && props.state.selectedId ? [props.state.selectedId] : []);
const matches = computed(() => findMindEditorTopics(entries.value, query.value));
const results = computed(() => matches.value.slice(page.value * 100, (page.value + 1) * 100));
const unavailable = computed(() => props.state.busy || props.state.composing);

// Only a visible consumer follows document changes. Selection/viewport notifications
// never rebuild this index or the shared TreeView collection.
watch([() => props.editor, () => props.version, () => props.state.busy, () => props.state.composing], () => {
  if (unavailable.value) return;
  try {
    entries.value = props.editor.getOutline();
    if (!initialized) { expanded.value = entries.value.filter(entry => entry.parentId === null).map(entry => entry.id); initialized = true; }
    page.value = Math.min(page.value, Math.max(0, Math.ceil(matches.value.length / 100) - 1));
  } catch (reason) { emit("error", reason); }
}, { immediate: true });
watch(query, () => { page.value = 0; current.value = -1; note.value = ""; });
onMounted(() => { panel.value?.querySelector("input")?.focus({ preventScroll: true }); });

/** @param id - Current outline/search target. @returns Completion of explicit navigation. */
async function reveal(id: string): Promise<void> {
  if (unavailable.value) return;
  try {
    note.value = await props.editor.reveal(id, false) ? "" : t("collapsedReadOnly");
    current.value = matches.value.findIndex(entry => entry.id === id);
  } catch (reason) { emit("error", reason); }
}
/** @param direction - Previous or next search result. @returns Completion of navigation with wraparound. */
async function step(direction: number): Promise<void> {
  if (!matches.value.length || unavailable.value) return;
  const index = current.value < 0 ? (direction < 0 ? matches.value.length - 1 : 0)
    : (current.value + direction + matches.value.length) % matches.value.length;
  page.value = Math.floor(index / 100);
  await reveal(matches.value[index]!.id);
}
/** @param event - Native search key, never a canvas text composition. */
function searchKey(event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229) return;
  if (event.key === "Enter") { event.preventDefault(); void step(event.shiftKey ? -1 : 1); }
}
/** @param event - Panel-local keyboard input; native composition keeps Escape. */
function panelKey(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key === "Escape" && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); emit("close"); }
}
</script>

<template>
  <aside ref="panel" class="qk-mind-editor__outline" :aria-label="t('find')" @keydown="panelKey">
    <header class="qk-mind-editor__outline-header"><strong>{{ t('find') }}</strong><QuireIconButton :label="t('closeFind')" variant="ghost" size="sm" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <QuireInput v-model="query" :aria-label="t('searchTopics')" :placeholder="t('searchPlaceholder')" width="100%" clearable @keydown="searchKey" />
    <template v-if="query.trim()">
      <div class="qk-mind-editor__outline-controls">
        <span aria-live="polite">{{ matches.length ? `${current >= 0 ? current + 1 : 0} / ${matches.length}` : t('noMatches') }}</span>
        <QuireIconButton :label="t('previousMatch')" variant="ghost" size="sm" :disabled="!matches.length || unavailable" @click="step(-1)"><QuireIcon name="chevronUp" /></QuireIconButton>
        <QuireIconButton :label="t('nextMatch')" variant="ghost" size="sm" :disabled="!matches.length || unavailable" @click="step(1)"><QuireIcon name="chevronDown" /></QuireIconButton>
      </div>
      <div class="qk-mind-editor__outline-scroll">
        <ul class="qk-mind-editor__results">
          <li v-for="entry in results" :key="entry.id">
            <QuireButton variant="ghost" color="neutral" :disabled="unavailable || state.readOnly && entry.hidden" :aria-current="state.selectedId === entry.id ? 'true' : undefined"
              :title="entry.text" @click="reveal(entry.id)">{{ entry.text || t('emptyTopic') }}<small v-if="entry.hidden">{{ t('collapsedContent') }}</small></QuireButton>
          </li>
        </ul>
      </div>
      <div v-if="matches.length > 100" class="qk-mind-editor__outline-controls">
        <QuireButton size="sm" variant="ghost" :disabled="page === 0" @click="page--">{{ t('previousPage') }}</QuireButton>
        <span>{{ page + 1 }} / {{ Math.ceil(matches.length / 100) }}</span>
        <QuireButton size="sm" variant="ghost" :disabled="(page + 1) * 100 >= matches.length" @click="page++">{{ t('nextPage') }}</QuireButton>
      </div>
    </template>
    <template v-else>
      <p class="qk-mind-editor__outline-note">{{ t('topicCount', { count: entries.length }) }}</p>
      <div class="qk-mind-editor__outline-scroll">
        <QuireTreeView :label="t('outline')" :nodes="nodes" :selected-value="selected" v-model:expanded-value="expanded" :expand-on-click="false" lazy-mount unmount-on-exit
          @selection-change="details => details.selectedValue[0] && reveal(details.selectedValue[0])" />
      </div>
    </template>
    <p v-if="note" class="qk-mind-editor__outline-note" role="status">{{ note }}</p>
  </aside>
</template>
