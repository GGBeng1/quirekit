<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import {
  QuireButton,
  QuireCheckbox,
  QuireIcon,
  QuireIconButton,
  QuireInput,
  QuireSegmented
} from "@quirekit/ui/vue";
import type { QuireEditor } from "@quirekit/core";
import { resolveClassicEditorText } from "@classic/localization";
import type { ClassicEditorLocale, ClassicEditorText } from "@classic/types";
import {
  classicSearchText,
  formatClassicExcludedNotice,
  formatClassicReplaceAll,
  formatClassicSearchCount
} from "./localization";
import ClassicSearchResultList from "./result-list.vue";
import type { ClassicSearchSession } from "./session";
import { useClassicSearchPanel } from "./use-panel";

/** Inputs for the search panel body. */
interface ClassicSearchPanelProps {
  /** Editor searched by this panel. */
  readonly editor: QuireEditor;
  /** Root-local session shared with triggers. */
  readonly session: ClassicSearchSession;
  /** Active product locale. */
  readonly locale: ClassicEditorLocale;
}

const props = defineProps<ClassicSearchPanelProps>();
const findField = ref<HTMLElement>();
const {
  state,
  snapshot,
  editable,
  committed,
  wholeWordAvailable,
  recommitIfActive,
  select,
  replaceAll
} = useClassicSearchPanel(props.editor, props.session);

/**
 * @param text - Localizable product copy.
 * @returns Copy for the active locale.
 */
function message(text: ClassicEditorText): string {
  return resolveClassicEditorText(text, props.locale);
}

const modeItems = computed(() => [
  { value: "find", label: message(classicSearchText.find) },
  { value: "replace", label: message(classicSearchText.replace), disabled: !editable.value }
]);
const status = computed(() => {
  const current = snapshot.value;
  if (!committed.value) return message(classicSearchText.idle);
  if (current.lastReplaceAll !== null) {
    return formatClassicReplaceAll(props.locale, current.lastReplaceAll.replaced, current.lastReplaceAll.skipped);
  }
  if (current.count === 0) return message(classicSearchText.none);
  return formatClassicSearchCount(props.locale, current.count, current.activeIndex);
});

const excludedNotice = computed(() => committed.value && snapshot.value.excludedCount > 0
  ? formatClassicExcludedNotice(props.locale, snapshot.value.excludedCount)
  : null);

/**
 * Enter navigates forward and Shift+Enter backward; composition keeps Enter for the IME.
 *
 * @param event - Key event from the find input.
 */
function handleQueryKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  select({ kind: event.shiftKey ? "previous" : "next" });
}

/**
 * Updates one matching option and re-runs an active search.
 *
 * @param key - Option to update.
 * @param checked - Checkbox state.
 */
function setOption(
  key: "caseSensitive" | "wholeWord" | "ignoreWidth" | "inSelection",
  checked: boolean | "indeterminate" | undefined
): void {
  state[key] = checked === true;
  recommitIfActive();
}

/** @param mode - Requested mode from the segmented control. */
function setMode(mode: string | null | undefined): void {
  if (mode === "find" || mode === "replace") state.mode = mode;
}

/** Focuses and selects the find input for a fresh trigger. */
async function focusQuery(): Promise<void> {
  await nextTick();
  const input = findField.value?.querySelector("input");
  input?.focus({ preventScroll: true });
  input?.select();
}

watch(() => state.focusRequest, focusQuery);
onMounted(focusQuery);
</script>

<template>
  <div class="qk-classic-search">
    <QuireSegmented
      v-if="editable"
      equal
      size="sm"
      :label="message(classicSearchText.mode)"
      :items="modeItems"
      :model-value="state.mode"
      @update:model-value="setMode"
    />
    <div ref="findField" class="qk-classic-search__field">
      <QuireInput
        width="100%"
        size="sm"
        clearable
        :aria-label="message(classicSearchText.find)"
        :placeholder="message(classicSearchText.findPlaceholder)"
        :model-value="state.findText"
        @update:model-value="state.findText = $event"
        @keydown="handleQueryKeydown"
      />
    </div>
    <QuireInput
      v-if="state.mode === 'replace'"
      width="100%"
      size="sm"
      :aria-label="message(classicSearchText.replaceWith)"
      :placeholder="message(classicSearchText.replacePlaceholder)"
      :model-value="state.replaceText"
      @update:model-value="state.replaceText = $event"
    />
    <div class="qk-classic-search__options" role="group" :aria-label="message(classicSearchText.options)">
      <QuireCheckbox
        size="sm"
        :label="message(classicSearchText.caseSensitive)"
        :checked="state.caseSensitive"
        @update:checked="setOption('caseSensitive', $event)"
      />
      <QuireCheckbox
        size="sm"
        :label="message(classicSearchText.wholeWord)"
        :disabled="!wholeWordAvailable"
        :checked="state.wholeWord && wholeWordAvailable"
        @update:checked="setOption('wholeWord', $event)"
      />
      <QuireCheckbox
        size="sm"
        :label="message(classicSearchText.ignoreWidth)"
        :checked="state.ignoreWidth"
        @update:checked="setOption('ignoreWidth', $event)"
      />
      <QuireCheckbox
        v-if="state.scopeRange !== null"
        size="sm"
        :label="message(classicSearchText.inSelection)"
        :checked="state.inSelection"
        @update:checked="setOption('inSelection', $event)"
      />
    </div>
    <div class="qk-classic-search__navigation">
      <p class="qk-classic-search__status" role="status" aria-live="polite">{{ status }}</p>
      <QuireIconButton
        size="sm"
        :label="message(classicSearchText.previous)"
        :title="message(classicSearchText.previous)"
        :disabled="state.findText.length === 0"
        @click="select({ kind: 'previous' })"
      ><QuireIcon name="chevronUp" :size="16" /></QuireIconButton>
      <QuireIconButton
        size="sm"
        :label="message(classicSearchText.next)"
        :title="message(classicSearchText.next)"
        :disabled="state.findText.length === 0"
        @click="select({ kind: 'next' })"
      ><QuireIcon name="chevronDown" :size="16" /></QuireIconButton>
    </div>
    <p v-if="excludedNotice" class="qk-classic-search__notice">{{ excludedNotice }}</p>
    <div v-if="state.mode === 'replace'" class="qk-classic-search__actions">
      <QuireButton
        variant="soft"
        size="sm"
        :disabled="state.findText.length === 0"
        @click="select({ kind: 'replace' })"
      >{{ message(classicSearchText.replaceOne) }}</QuireButton>
      <QuireButton
        color="primary"
        variant="solid"
        size="sm"
        :disabled="state.findText.length === 0"
        @click="replaceAll"
      >{{ message(classicSearchText.replaceAll) }}</QuireButton>
    </div>
    <ClassicSearchResultList
      v-if="committed"
      :editor="editor"
      :version="snapshot.version"
      :active-index="snapshot.activeIndex"
      :label="message(classicSearchText.results)"
      @select="select({ kind: 'index', index: $event })"
    />
  </div>
</template>

<style scoped>
.qk-classic-search { display: grid; gap: var(--qk-space-surface-compact); padding: var(--qk-space-surface-compact); }
.qk-classic-search__options { display: flex; flex-wrap: wrap; gap: var(--qk-space-inline) var(--qk-space-surface-compact); }
.qk-classic-search__navigation { display: flex; align-items: center; gap: var(--qk-space-inline); }
.qk-classic-search__status { flex: 1; min-width: 0; margin: 0; color: var(--qk-color-text-secondary); font-size: var(--qk-type-helper-font-size); }
.qk-classic-search__notice { margin: 0; color: var(--qk-color-text-secondary); font-size: var(--qk-type-helper-font-size); }
.qk-classic-search__actions { display: flex; justify-content: flex-end; gap: var(--qk-space-inline); }
</style>
