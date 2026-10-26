<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { QuireButton, QuireCheckbox, QuireIcon, QuireIconButton, QuireInput, QuireSegmented } from "@quirekit/ui/vue";
import type { SearchPanelProps, SearchParameters } from "@quirekit/msfe-core";
import { mdLocaleKey } from "../context";
import { mdEditorMessages } from "../messages";
import { MD_SEARCH_MODE_EVENT, takeRequestedSearchMode, type MdSearchMode } from "./mode";

// Search panel aligned with Classic's find-and-replace card. CodeMirror owns the query, matches,
// selection and transactions; this component only edits the query and runs explicit actions.
const props = defineProps<{ /** Current search state and actions from the editor. */ view: SearchPanelProps }>();
const locale = inject(mdLocaleKey, shallowRef("zh-CN"));
const text = computed(() => mdEditorMessages[locale.value]);
const root = useTemplateRef<HTMLElement>("root");
const mode = shallowRef<MdSearchMode>("find");
/** Replace-all outcome, shown until the query changes. */
const replaced = shallowRef<number | null>(null);

const modeItems = computed(() => [
  { value: "find", label: text.value.searchFind },
  { value: "replace", label: text.value.searchReplace, disabled: props.view.readOnly },
]);
const total = computed(() => `${props.view.matches.total}${props.view.matches.limited ? "+" : ""}`);
const status = computed(() => {
  if (replaced.value !== null) return text.value.searchReplaced.replace("{count}", String(replaced.value));
  if (!props.view.query.search) return text.value.searchIdle;
  if (!props.view.valid) return text.value.searchInvalid;
  if (!props.view.matches.total) return text.value.searchNone;
  return props.view.matches.current
    ? text.value.searchCount.replace("{current}", String(props.view.matches.current)).replace("{total}", total.value)
    : text.value.searchTotal.replace("{total}", total.value);
});
const searchable = computed(() => !!props.view.query.search && props.view.valid && props.view.matches.total > 0);

watch(() => JSON.stringify(props.view.query), () => { replaced.value = null; });
// Replace-all leaves no matches; any match reappearing (undo, new text) returns to the count.
watch(() => props.view.matches.total, total => { if (total > 0) replaced.value = null; });
watch(() => props.view.readOnly, readOnly => { if (readOnly) mode.value = "find"; });

/** @param changes - Query fields edited in the panel. */
function update(changes: Partial<SearchParameters>): void { props.view.setQuery(changes); }

/** @param event - Key event from the find field; composition keeps Enter for the IME. */
function findKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  props.view.run(event.shiftKey ? "previous" : "next");
}

/** @param event - Key event from the replace field. */
function replaceKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  props.view.run("replace");
}

/** Replaces every match in one transaction, so a single undo restores them. */
function replaceAll(): void {
  const count = props.view.matches.total;
  if (props.view.run("replaceAll")) replaced.value = count;
}

/** @param next - Requested panel mode; replace falls back to find while read-only. */
async function setMode(next: unknown): Promise<void> {
  if (next !== "find" && next !== "replace") return;
  mode.value = next === "replace" && !props.view.readOnly ? "replace" : "find";
  await nextTick();
  const field = root.value?.querySelector<HTMLInputElement>(mode.value === "replace" ? "input[name=replace]" : "input[name=search]");
  field?.focus(); field?.select();
}

/** @param event - Mode request from the editor shortcut while the panel is already open. */
function onModeRequest(event: Event): void { void setMode((event as CustomEvent<MdSearchMode>).detail); }

onMounted(() => {
  const host = root.value?.parentElement;
  host?.addEventListener(MD_SEARCH_MODE_EVENT, onModeRequest);
  const requested = host ? takeRequestedSearchMode(host) : null;
  if (requested === "replace") void setMode("replace");
});
onBeforeUnmount(() => root.value?.parentElement?.removeEventListener(MD_SEARCH_MODE_EVENT, onModeRequest));
</script>

<template>
  <section ref="root" class="qk-floating-panel md-search" role="search" :aria-label="text.searchTitle">
    <header class="qk-floating-panel__header md-search__header">
      <h2 class="qk-floating-panel__title">{{ text.searchTitle }}</h2>
      <QuireIconButton size="sm" :label="text.searchClose" :title="text.searchClose" @click="view.run('close')">
        <QuireIcon name="close" :size="16" />
      </QuireIconButton>
    </header>
    <div class="md-search__body">
      <QuireSegmented v-if="!view.readOnly" equal size="sm" :label="text.searchMode" :items="modeItems" :model-value="mode" @update:model-value="setMode" />
      <QuireInput width="100%" size="sm" clearable name="search" main-field :aria-label="text.searchFind" :placeholder="text.searchFindPlaceholder"
        :model-value="view.query.search" @update:model-value="update({ search: String($event ?? '') })" @keydown="findKeydown" />
      <QuireInput v-if="mode === 'replace'" width="100%" size="sm" name="replace" :aria-label="text.searchReplace" :placeholder="text.searchReplacePlaceholder"
        :model-value="view.query.replace" @update:model-value="update({ replace: String($event ?? '') })" @keydown="replaceKeydown" />
      <div class="md-search__options" role="group" :aria-label="text.searchOptions">
        <QuireCheckbox size="sm" :label="text.searchCaseSensitive" :checked="view.query.caseSensitive" @update:checked="update({ caseSensitive: $event === true })" />
        <QuireCheckbox size="sm" :label="text.searchWholeWord" :checked="view.query.wholeWord" @update:checked="update({ wholeWord: $event === true })" />
        <QuireCheckbox size="sm" :label="text.searchRegexp" :checked="view.query.regexp" @update:checked="update({ regexp: $event === true })" />
      </div>
      <div class="md-search__navigation">
        <p class="md-search__status" role="status" aria-live="polite">{{ status }}</p>
        <QuireIconButton size="sm" :label="text.searchPrevious" :title="text.searchPrevious" :disabled="!searchable" @click="view.run('previous')">
          <QuireIcon name="chevronUp" :size="16" />
        </QuireIconButton>
        <QuireIconButton size="sm" :label="text.searchNext" :title="text.searchNext" :disabled="!searchable" @click="view.run('next')">
          <QuireIcon name="chevronDown" :size="16" />
        </QuireIconButton>
      </div>
      <div v-if="mode === 'replace'" class="md-search__actions">
        <QuireButton variant="soft" size="sm" :disabled="!searchable" @click="view.run('replace')">{{ text.searchReplaceOne }}</QuireButton>
        <QuireButton color="primary" variant="solid" size="sm" :disabled="!searchable" @click="replaceAll">{{ text.searchReplaceAll }}</QuireButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The card floats at the top-right of CodeMirror's sticky top panel, so it stays visible while the page scrolls. */
.md-search { inset-inline: auto var(--qk-space-surface-compact); inset-block-start: var(--qk-space-surface-compact); width: min(340px, calc(100% - 2 * var(--qk-space-surface-compact))); }
.md-search__header { cursor: default; }
.md-search__body { display: grid; gap: var(--qk-space-surface-compact); padding: var(--qk-space-surface-compact); }
.md-search__options { display: flex; flex-wrap: wrap; gap: var(--qk-space-inline) var(--qk-space-surface-compact); }
.md-search__navigation { display: flex; align-items: center; gap: var(--qk-space-inline); }
.md-search__status { flex: 1; min-width: 0; margin: 0; color: var(--qk-color-text-secondary); font-size: var(--qk-type-helper-font-size); }
.md-search__actions { display: flex; justify-content: flex-end; gap: var(--qk-space-inline); }
</style>
