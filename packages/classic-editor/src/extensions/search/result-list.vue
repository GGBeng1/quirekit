<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { QuireEditor } from "@quirekit/core";
import { getSearchPluginState, readSearchMatchSnippet } from "@quirekit/extension-search";

/** Inputs for the virtualized match list. */
interface ClassicSearchResultListProps {
  /** Editor whose matches are listed. */
  readonly editor: QuireEditor;
  /** Search state version; rows are re-read whenever it changes. */
  readonly version: number;
  /** Zero-based active match, or -1. */
  readonly activeIndex: number;
  /** Accessible list name. */
  readonly label: string;
}

const props = defineProps<ClassicSearchResultListProps>();
const emit = defineEmits<{
  /** Requests selection of one match by index. */
  select: [index: number];
}>();

/** Fixed row height in CSS pixels; windowing depends on it. */
const rowHeight = 28;
/** Rows rendered above and below the visible window. */
const overscan = 6;
/** Context characters on each side, short enough to keep the match visible in one row. */
const snippetRadius = 12;
/** Maximum list viewport height in CSS pixels. */
const viewportHeight = 320;

const viewport = ref<HTMLElement>();
const scrollTop = ref(0);
const matches = computed(() => {
  void props.version;
  return getSearchPluginState(props.editor.state.pm).matches;
});
// Only rows inside the scrolled window read snippets, so long result sets stay cheap.
const visibleRows = computed(() => {
  const first = Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan);
  const last = Math.min(
    matches.value.length,
    Math.ceil((scrollTop.value + viewportHeight) / rowHeight) + overscan
  );
  const doc = props.editor.state.pm.doc;
  return matches.value.slice(first, last).map((match, offset) => ({
    index: first + offset,
    snippet: readSearchMatchSnippet(doc, match, snippetRadius)
  }));
});

/** @param event - Scroll event of the list viewport. */
function handleScroll(event: Event): void {
  scrollTop.value = (event.target as HTMLElement).scrollTop;
}

watch(() => props.activeIndex, (index) => {
  const element = viewport.value;
  if (index < 0 || element === undefined) return;
  const top = index * rowHeight;
  if (top < element.scrollTop) element.scrollTop = top;
  else if (top + rowHeight > element.scrollTop + element.clientHeight) {
    element.scrollTop = top + rowHeight - element.clientHeight;
  }
  scrollTop.value = element.scrollTop;
});
</script>

<template>
  <div
    v-if="matches.length > 0"
    ref="viewport"
    class="qk-classic-search-results"
    role="listbox"
    :aria-label="label"
    :aria-activedescendant="activeIndex >= 0 ? `qk-classic-search-result-${activeIndex}` : undefined"
    :style="{ maxHeight: `${viewportHeight}px` }"
    @scroll="handleScroll"
  >
    <div :style="{ height: `${matches.length * rowHeight}px`, position: 'relative' }">
      <button
        v-for="row in visibleRows"
        :id="`qk-classic-search-result-${row.index}`"
        :key="row.index"
        type="button"
        role="option"
        class="qk-classic-search-results__row"
        :aria-selected="row.index === activeIndex"
        :style="{ top: `${row.index * rowHeight}px`, height: `${rowHeight}px` }"
        @click="emit('select', row.index)"
      >
        <span v-if="row.snippet.truncatedBefore">…</span>{{ row.snippet.before }}<mark>{{ row.snippet.text }}</mark>{{ row.snippet.after }}<span v-if="row.snippet.truncatedAfter">…</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.qk-classic-search-results { overflow-y: auto; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-control, 6px); }
.qk-classic-search-results__row {
  position: absolute; inset-inline: 0; display: block; padding: 0 var(--qk-space-inline);
  overflow: hidden; border: 0; background: transparent; color: var(--qk-color-text-primary);
  font: inherit; font-size: var(--qk-type-helper-font-size); line-height: 28px; text-align: start;
  white-space: nowrap; text-overflow: ellipsis; cursor: pointer;
}
.qk-classic-search-results__row:hover { background: var(--qk-color-surface-hover); }
.qk-classic-search-results__row[aria-selected="true"] { background: var(--qk-color-surface-selected); }
.qk-classic-search-results__row mark { background: rgba(255, 196, 0, 0.35); color: inherit; }
</style>
