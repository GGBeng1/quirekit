<script setup lang="ts">
import { nextTick, shallowRef, watch } from "vue";
import { QuireEmptyState, QuireTreeView } from "@quirekit/ui/vue";
import type { QuireKitTreeViewExpandedChangeDetails, QuireKitTreeViewSelectionChangeDetails } from "@quirekit/ui";
import type { MdOutlineTree } from "../../outline";

/** Outline panel inputs. */
interface Props {
  /** Nested headings and their branch ids. */
  readonly tree: MdOutlineTree;
  /** Heading that owns the reading line. */
  readonly active: string | undefined;
  /** Accessible outline name. */
  readonly label: string;
  /** Empty-state title shown without headings. */
  readonly empty: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ /** User chose a heading. */ navigate: [id: string] }>();
const scroller = shallowRef<HTMLElement | null>(null);
const expanded = shallowRef<string[]>([]);
let known = new Set<string>();

// New branches open by default; branches the user collapsed stay collapsed across edits.
watch(() => props.tree.branches, branches => {
  const current = new Set(branches);
  expanded.value = [...expanded.value.filter(id => current.has(id)), ...branches.filter(id => !known.has(id))];
  known = current;
}, { immediate: true });

// Keep the active row visible inside the panel's own scroll box without moving the page.
watch(() => props.active, async id => {
  await nextTick();
  const box = scroller.value, value = id ? CSS.escape(id) : "";
  const row = value ? box?.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"], [data-part="branch-control"][data-value="${value}"]`) : null;
  if (!box || !row) return;
  const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top;
  if (top < 0) box.scrollTop += top;
  else if (top + row.offsetHeight > box.clientHeight) box.scrollTop += top + row.offsetHeight - box.clientHeight;
});

/** @param details - TreeView expansion change. */
function changeExpanded(details: QuireKitTreeViewExpandedChangeDetails): void { expanded.value = [...details.expandedValue]; }

/** @param details - TreeView selection change; reselecting the active row arrives as an empty selection. */
function select(details: QuireKitTreeViewSelectionChangeDetails): void {
  const id = details.selectedValue[0] ?? props.active;
  if (id) emit("navigate", id);
}

/** @param event - Mouse press; keeps the editor's text focus until navigation commits. */
function keepEditorFocus(event: PointerEvent): void {
  if (event.button === 0 && event.pointerType !== "touch") event.preventDefault();
}
</script>

<template>
  <div ref="scroller" class="md-outline">
    <QuireTreeView v-if="tree.nodes.length" :label="label" :nodes="tree.nodes" :expanded-value="expanded"
      :selected-value="active ? [active] : []" selection-appearance="text" class="md-outline__tree"
      @pointerdown="keepEditorFocus" @expanded-change="changeExpanded" @selection-change="select" />
    <QuireEmptyState v-else :title="empty" :label="label" :heading-level="3" size="sm" scene="data" />
  </div>
</template>

<style scoped>
.md-outline { min-height: 0; overflow: auto; overscroll-behavior: contain; }
/* Inactive headings recede so the current one stands out under any host accent color. */
.md-outline :deep(:is([data-part="item"], [data-part="branch-control"]):not([data-selected])) { color: var(--qk-color-text-muted); }
</style>
