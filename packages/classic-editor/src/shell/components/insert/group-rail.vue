<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { ClassicEditorLocale } from "../../../types";
import {
  classicEditorInsertGroups,
  localizeClassicEditorInsertText
} from "../../../runtime/insert";
import type { ClassicEditorInsertGroupId } from "../../../types/insert";
import { getClassicEditorInsertMessage } from "./localization";

/** Inputs for wide-screen Insert group navigation. */
interface ClassicEditorInsertGroupRailProps {
  /** Mounted product locale. */
  readonly locale: ClassicEditorLocale;
  /** Selected semantic group or recent-success view. */
  readonly selected: ClassicEditorInsertGroupId | "recent";
  /** Whether recent-success state contains at least one visible item. */
  readonly hasRecent: boolean;
  /** Live visible item count per semantic group. */
  readonly counts: Readonly<Record<ClassicEditorInsertGroupId, number>>;
}

/** Group selection event retaining a typed semantic group. */
interface ClassicEditorInsertGroupRailEmits {
  /** Reports the selected recent or semantic group. */
  select: [group: ClassicEditorInsertGroupId | "recent"];
}

const props = defineProps<ClassicEditorInsertGroupRailProps>();
const emit = defineEmits<ClassicEditorInsertGroupRailEmits>();
const buttons = ref<HTMLButtonElement[]>([]);
const entries = computed(() => [
  ...(props.hasRecent
    ? [{ id: "recent" as const, label: getClassicEditorInsertMessage(props.locale, "recent") }]
    : []),
  ...classicEditorInsertGroups.map((group) => ({
    id: group.id,
    label: localizeClassicEditorInsertText(group.label, props.locale)
  }))
]);

/**
 * Moves focus through the vertical tab rail without changing document selection.
 *
 * @param event - Keyboard event received by one group tab.
 * @param index - Current tab index.
 */
function navigate(event: KeyboardEvent, index: number): void {
  const last = entries.value.length - 1;
  const next = event.key === "ArrowDown"
    ? Math.min(last, index + 1)
    : event.key === "ArrowUp"
      ? Math.max(0, index - 1)
      : event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : -1;
  if (next < 0) return;
  event.preventDefault();
  emit("select", entries.value[next]!.id);
  void nextTick(() => buttons.value[next]?.focus());
}
</script>

<template>
  <nav
    class="qk-classic-insert-groups"
    role="tablist"
    aria-orientation="vertical"
    :aria-label="getClassicEditorInsertMessage(locale, 'allGroups')"
  >
    <button
      v-for="(entry, index) in entries"
      :key="entry.id"
      ref="buttons"
      type="button"
      role="tab"
      class="qk-classic-insert-groups__tab"
      :class="{ 'is-selected': selected === entry.id }"
      :aria-selected="selected === entry.id"
      :tabindex="selected === entry.id ? 0 : -1"
      :data-insert-group-tab="entry.id"
      @click="$emit('select', entry.id)"
      @keydown="navigate($event, index)"
    >
      <span>{{ entry.label }}</span>
      <span v-if="entry.id !== 'recent'" class="qk-classic-insert-groups__count">
        {{ counts[entry.id] }}
      </span>
    </button>
  </nav>
</template>
