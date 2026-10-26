<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";
import { useClassicEditorOverlay } from "../../overlays/registry";
import {
  classicEditorInsertGroups,
  getClassicEditorInsertGroup,
  localizeClassicEditorInsertText,
  type ClassicEditorInsertCatalog
} from "../../../runtime/insert";
import type {
  ClassicEditorInsertGroupId,
  ResolvedClassicEditorInsertItem
} from "../../../types/insert";
import ClassicEditorInsertGroupRail from "./group-rail.vue";
import ClassicEditorInsertItemButton from "./item-button.vue";
import {
  getClassicEditorInsertMessage
} from "./localization";
import type {
  ClassicEditorInsertSurfaceHandle,
  ClassicEditorInsertSurfaceState
} from "./types";
import { useClassicEditorInsertCompactLayout } from "./use-responsive";

/** Inputs for the mounted root-local Insert surface. */
interface ClassicEditorInsertSurfaceProps {
  /** Reactive latest mounted context. */
  readonly state: ClassicEditorInsertSurfaceState;
  /** Instance-scoped typed catalog and recent-success state. */
  readonly catalog: ClassicEditorInsertCatalog;
  /** Registers the imperative trigger port without exposing a Vue component type. */
  readonly registerHandle: (handle: ClassicEditorInsertSurfaceHandle | null) => void;
}

const props = defineProps<ClassicEditorInsertSurfaceProps>();
const visible = ref(false);
const draftQuery = ref("");
const committedQuery = ref("");
const composing = ref(false);
const selectedGroup = ref<ClassicEditorInsertGroupId | "recent" | null>(null);
const announcement = ref("");
const busyItemId = ref<string | null>(null);
const recentRevision = ref(0);
const search = ref<HTMLInputElement>();
const surface = ref<HTMLElement>();
const compact = useClassicEditorInsertCompactLayout(() => props.state.context.root);
let trigger: HTMLElement | null = null;
let restoreOnDismiss = true;
const overlay = useClassicEditorOverlay(
  "insert-catalog",
  visible,
  props.state.context.ownerDocument,
  { resolveRoot: () => props.state.context.root }
);
const resultsId = `${overlay.id}-results`;
const locale = computed(() => props.state.context.locale);
const allItems = computed(() => props.catalog.resolve(props.state.context, {
  locale: locale.value,
  value: ""
}));
const recentItems = computed(() => {
  void recentRevision.value;
  return props.catalog.resolveRecent(props.state.context, { locale: locale.value });
});
const groupCounts = computed<Readonly<Record<ClassicEditorInsertGroupId, number>>>(() => ({
  inline: allItems.value.filter((item) => item.definition.group === "inline").length,
  structure: allItems.value.filter((item) => item.definition.group === "structure").length,
  media: allItems.value.filter((item) => item.definition.group === "media").length,
  control: allItems.value.filter((item) => item.definition.group === "control").length
}));
const isSearching = computed(() => committedQuery.value.trim() !== "");
const results = computed(() => {
  if (!isSearching.value && selectedGroup.value === "recent") return recentItems.value;
  return props.catalog.resolve(props.state.context, {
    locale: locale.value,
    value: committedQuery.value,
    ...(!isSearching.value
      && selectedGroup.value !== null
      && selectedGroup.value !== "recent"
      ? { group: selectedGroup.value }
      : {})
  });
});
const galleryResults = computed(() => results.value.filter(
  (item) => item.definition.presentation === "gallery"
));
const listResults = computed(() => results.value.filter(
  (item) => item.definition.presentation !== "gallery"
));
const showNarrowHome = computed(() => (
  compact.value && !isSearching.value && selectedGroup.value === null
));
const resultHeading = computed(() => {
  if (isSearching.value) return getClassicEditorInsertMessage(locale.value, "search");
  if (selectedGroup.value === "recent") {
    return getClassicEditorInsertMessage(locale.value, "recent");
  }
  return selectedGroup.value === null
    ? getClassicEditorInsertMessage(locale.value, "allGroups")
    : localizeClassicEditorInsertText(
        getClassicEditorInsertGroup(selectedGroup.value).label,
        locale.value
      );
});

/** Opens one bounded surface and focuses search after canonical overlay transfer. */
function open(nextTrigger: HTMLElement | null): void {
  trigger = nextTrigger;
  restoreOnDismiss = true;
  draftQuery.value = "";
  committedQuery.value = "";
  announcement.value = "";
  selectedGroup.value = compact.value
    ? null
    : recentItems.value.length > 0
      ? "recent"
      : "inline";
  overlay.setVisible(true);
  void nextTick(() => search.value?.focus());
}

/**
 * Closes the surface and optionally restores its exact source control.
 *
 * @param restoreFocus - Whether dismissal returns to the opening trigger.
 */
function close(restoreFocus = true): void {
  restoreOnDismiss = restoreFocus;
  overlay.setVisible(false);
}

/** Returns to the narrow-screen category home without closing the Sheet. */
function back(): void {
  selectedGroup.value = null;
  void nextTick(() => search.value?.focus());
}

/**
 * Selects a semantic group and focuses its first result on narrow roots.
 *
 * @param group - Typed Insert group or recent-success view.
 */
function selectGroup(group: ClassicEditorInsertGroupId | "recent"): void {
  selectedGroup.value = group;
  if (compact.value) void nextTick(() => focusResult(0));
}

/**
 * Commits search changes only while IME does not own preedit text.
 *
 * @param event - Native input event from the search field.
 */
function updateSearch(event: Event): void {
  draftQuery.value = (event.target as HTMLInputElement).value;
  if (!composing.value) committedQuery.value = draftQuery.value;
}

/** Commits the completed IME composition as one searchable query. */
function finishComposition(): void {
  composing.value = false;
  committedQuery.value = draftQuery.value;
}

/**
 * Moves keyboard focus across all currently rendered item buttons.
 *
 * @param index - Target index in rendered item order.
 */
function focusResult(index: number): void {
  const buttons = surface.value?.querySelectorAll<HTMLButtonElement>("[data-insert-item]");
  if (buttons === undefined || buttons.length === 0) return;
  buttons[Math.max(0, Math.min(buttons.length - 1, index))]?.focus();
}

/**
 * Routes search-to-results navigation without intercepting IME composition.
 *
 * @param event - Search keydown event.
 */
function navigateFromSearch(event: KeyboardEvent): void {
  if (event.isComposing || event.key !== "ArrowDown") return;
  event.preventDefault();
  focusResult(0);
}

/**
 * Provides roving result navigation for list and gallery occurrences.
 *
 * @param event - Surface keydown event.
 */
function navigateResults(event: KeyboardEvent): void {
  const target = event.target;
  const HTMLButtonElementConstructor = props.state.context.ownerDocument.defaultView
    ?.HTMLButtonElement;
  if (
    HTMLButtonElementConstructor === undefined
    || !(target instanceof HTMLButtonElementConstructor)
    || target.dataset.insertItem === undefined
  ) return;
  const buttons = [...(surface.value?.querySelectorAll<HTMLButtonElement>("[data-insert-item]") ?? [])];
  const current = buttons.indexOf(target);
  const next = event.key === "ArrowDown" || event.key === "ArrowRight"
    ? Math.min(buttons.length - 1, current + 1)
    : event.key === "ArrowUp" || event.key === "ArrowLeft"
      ? Math.max(0, current - 1)
      : event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : -1;
  if (next < 0) return;
  event.preventDefault();
  buttons[next]?.focus();
}

/**
 * Revalidates and invokes one retained typed action without id dispatch.
 *
 * @param item - Exact resolved item emitted by the presenter.
 */
async function activate(item: ResolvedClassicEditorInsertItem): Promise<void> {
  if (!item.canExecute) {
    announcement.value = item.reason ?? getClassicEditorInsertMessage(locale.value, "failed");
    return;
  }
  if (busyItemId.value !== null) return;
  busyItemId.value = item.definition.id;
  announcement.value = getClassicEditorInsertMessage(locale.value, "inserting");
  const handled = await props.catalog.execute(item.definition, props.state.context);
  busyItemId.value = null;
  if (handled) {
    recentRevision.value += 1;
    close(false);
    return;
  }
  announcement.value = getClassicEditorInsertMessage(locale.value, "failed");
}

watch(visible, (next, previous) => {
  if (next || !previous || !restoreOnDismiss) return;
  const previousTrigger = trigger;
  trigger = null;
  void nextTick(() => previousTrigger?.focus());
});
watch(compact, (next) => {
  if (!visible.value) return;
  selectedGroup.value = next ? null : recentItems.value.length > 0 ? "recent" : "inline";
});

const handle: ClassicEditorInsertSurfaceHandle = Object.freeze({
  open,
  close: () => close(true)
});
onMounted(() => props.registerHandle(handle));
onBeforeUnmount(() => props.registerHandle(null));
</script>

<template>
  <div
    v-if="visible"
    class="qk-classic-insert-layer"
    :class="{ 'qk-classic-insert-layer--sheet': compact }"
    v-bind="overlay.ownerAttributes"
  >
    <section
      ref="surface"
      class="qk-classic-insert-surface"
      :data-insert-layout="compact ? 'sheet' : 'popover'"
      role="dialog"
      :aria-label="getClassicEditorInsertMessage(locale, 'title')"
      aria-modal="false"
      @keydown="navigateResults"
    >
      <header class="qk-classic-insert-surface__header">
        <button
          v-if="compact && selectedGroup !== null && !isSearching"
          type="button"
          class="qk-classic-insert-surface__back"
          :aria-label="getClassicEditorInsertMessage(locale, 'back')"
          @click="back"
        >
          ←
        </button>
        <span class="qk-classic-insert-surface__title-block">
          <strong>{{ getClassicEditorInsertMessage(locale, "title") }}</strong>
          <span>{{ getClassicEditorInsertMessage(locale, "subtitle") }}</span>
        </span>
        <button
          type="button"
          class="qk-classic-insert-surface__close"
          :aria-label="getClassicEditorInsertMessage(locale, 'close')"
          @click="close(true)"
        >
          ×
        </button>
      </header>

      <label class="qk-classic-insert-search">
        <span class="qk-classic-editor__sr-only">
          {{ getClassicEditorInsertMessage(locale, "search") }}
        </span>
        <span aria-hidden="true">⌕</span>
        <input
          ref="search"
          type="search"
          :value="draftQuery"
          :placeholder="getClassicEditorInsertMessage(locale, 'searchPlaceholder')"
          aria-autocomplete="list"
          :aria-controls="resultsId"
          @input="updateSearch"
          @compositionstart="composing = true"
          @compositionend="finishComposition"
          @keydown="navigateFromSearch"
        />
        <kbd v-if="!compact">Esc</kbd>
      </label>

      <div v-if="showNarrowHome" class="qk-classic-insert-home">
        <section v-if="recentItems.length > 0" class="qk-classic-insert-home__recent">
          <h2>{{ getClassicEditorInsertMessage(locale, "recent") }}</h2>
          <div class="qk-classic-insert-home__recent-items">
            <ClassicEditorInsertItemButton
              v-for="item in recentItems.slice(0, 3)"
              :key="item.definition.id"
              :item="item"
              :locale="locale"
              :busy="busyItemId !== null"
              @activate="activate"
            />
          </div>
        </section>
        <section class="qk-classic-insert-home__groups">
          <h2>{{ getClassicEditorInsertMessage(locale, "allGroups") }}</h2>
          <button
            v-for="group in classicEditorInsertGroups"
            :key="group.id"
            type="button"
            class="qk-classic-insert-group-card"
            :data-insert-group-card="group.id"
            @click="selectGroup(group.id)"
          >
            <span>
              <strong>{{ localizeClassicEditorInsertText(group.label, locale) }}</strong>
              <small>{{ localizeClassicEditorInsertText(group.description, locale) }}</small>
            </span>
            <span>{{ groupCounts[group.id] }} ›</span>
          </button>
        </section>
      </div>

      <div
        v-else
        class="qk-classic-insert-browser"
        :class="{ 'qk-classic-insert-browser--results-only': isSearching }"
      >
        <ClassicEditorInsertGroupRail
          v-if="!compact && !isSearching"
          :locale="locale"
          :selected="selectedGroup ?? 'inline'"
          :has-recent="recentItems.length > 0"
          :counts="groupCounts"
          @select="selectGroup"
        />
        <main
          :id="resultsId"
          class="qk-classic-insert-results"
          aria-live="polite"
        >
          <h2>{{ resultHeading }}</h2>
          <template v-if="results.length > 0">
            <div v-if="galleryResults.length > 0" class="qk-classic-insert-results__gallery">
              <ClassicEditorInsertItemButton
                v-for="item in galleryResults"
                :key="item.definition.id"
                :item="item"
                :locale="locale"
                :busy="busyItemId !== null"
                gallery
                @activate="activate"
              />
            </div>
            <div v-if="listResults.length > 0" class="qk-classic-insert-results__list">
              <ClassicEditorInsertItemButton
                v-for="item in listResults"
                :key="item.definition.id"
                :item="item"
                :locale="locale"
                :busy="busyItemId !== null"
                @activate="activate"
              />
            </div>
          </template>
          <div v-else class="qk-classic-insert-empty">
            <strong>{{ selectedGroup === "recent"
              ? getClassicEditorInsertMessage(locale, "noRecent")
              : getClassicEditorInsertMessage(locale, "empty") }}</strong>
            <span>{{ getClassicEditorInsertMessage(locale, "emptyHint") }}</span>
          </div>
        </main>
      </div>
      <p class="qk-classic-editor__sr-only" role="status" aria-live="polite">
        {{ announcement }}
      </p>
    </section>
  </div>
</template>
