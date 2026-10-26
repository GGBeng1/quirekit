<script setup lang="ts">
import { computed, ref } from "vue";
import { QuireIcon, QuireInput, QuireMenuItem, QuireMenuSeparator, QuireMenuGroup, QuireToolbar, QuireToolbarAction } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorBlockInsertionTarget, ClassicEditorInsertItemContribution } from "@classic/types";
import type { ClassicEditorShellModel } from "../../../types";
import { ClassicEditorInsertCatalog } from "@classic/runtime/insert";
import { selectVisibleClassicEditorContributions } from "../../../contribution/visibility";
import type { useBlockTypes } from "../use-block-types";
import Picker from "./picker.vue";

const props = defineProps<{
  /** Current mounted product. */
  model: ClassicEditorShellModel;
  /** Immutable destination captured on opening this panel. */
  target: ClassicEditorBlockInsertionTarget;
  /** Existing feature-owned paragraph presets. */
  types: ReturnType<typeof useBlockTypes>["types"]["value"];
  /** Parent panel owner. */
  parentId: string;
  /** Document overlay host. */
  portalTarget?: HTMLElement | undefined;
}>();
const emit = defineEmits<{ /** Completed insertion closes its entire menu branch. */ close: [] }>();
const query = ref("");
const busy = ref(false);
const model = computed(() => ({ ...props.model, context: props.model.context && { ...props.model.context, blockInsertion: props.target } }));
const english = computed(() => props.model.locale === "en");
const definitions = computed(() => model.value.context ? selectVisibleClassicEditorContributions(
  model.value.context.instance.registry.contributions, model.value.context, "insert-item"
) : []);
const catalog = computed(() => new ClassicEditorInsertCatalog({ items: definitions.value }));
const resolved = computed(() => model.value.context ? catalog.value.resolve(model.value.context, { locale: props.model.locale, value: query.value }) : []);
const presets = computed(() => props.types.filter(item => !query.value.trim() || `${item.label} ${item.value}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())));
const entries = computed<readonly QuireKitToolbarEntry[]>(() => [
  ...presets.value.map(item => ({ kind: "action" as const, value: item.value, label: item.label, tooltip: item.label, icon: item.icon,
    disabled: busy.value || !item.node || !model.value.context?.editor.can().insertBlockAt({ ...props.target, content: item.node }) })),
  ...resolved.value.filter(item => definition(item.definition.id)?.quick).map(item => ({ kind: "action" as const,
    value: item.definition.id, label: item.label, tooltip: item.label, ...(item.definition.action.icon ? { icon: item.definition.action.icon } : {}), disabled: busy.value || !item.canExecute }))
]);
const groups = computed(() => [
  { id: "general", label: english.value ? "General" : "通用", items: resolved.value.filter(item => !definition(item.definition.id)?.quick && item.definition.group !== "control") },
  { id: "control", label: english.value ? "Content controls" : "内容控件", items: resolved.value.filter(item => item.definition.group === "control") }
].filter(group => group.items.length));
/** @param id - Retained item identity, used only for matching. @returns The exact installed definition. */
function definition(id: string): ClassicEditorInsertItemContribution | undefined { return definitions.value.find(item => item.id === id); }
/** @param item - Feature definition. @returns Theme-owned accent. */
function color(item: ClassicEditorInsertItemContribution): string {
  return item.color === "primary" ? "var(--qk-color-action-text)" : `var(--qk-color-${item.color ?? "info"}-text)`;
}
/** @param value - Existing typed action or paragraph preset selected by the user. */
async function insert(value: string): Promise<void> {
  const context = model.value.context;
  if (!context || busy.value) return;
  busy.value = true;
  try {
    const preset = props.types.find(item => item.value === value), item = definition(value);
    const handled = preset?.node ? context.editor.commands.insertBlockAt({ ...props.target, content: preset.node })
      : item ? await catalog.value.execute(item, context) : false;
    if (handled) { emit("close"); context.editor.view.focus(); }
  } finally { busy.value = false; }
}
/** @param event - Search navigation; editing keys remain inside the public field. */
function navigateSearch(event: KeyboardEvent): void {
  if (event.key === "Escape") return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp" || (event.key === "ArrowLeft" && !query.value)) {
    (event.currentTarget as HTMLElement).closest<HTMLElement>('[role="menu"]')?.focus({ preventScroll: true });
    return;
  }
  event.stopPropagation();
}
</script>

<template>
  <div class="qk-block-insert-search" @keydown="navigateSearch">
    <QuireInput v-model="query" size="sm" width="100%" type="search" clearable
      :aria-label="english ? 'Search insert content' : '搜索插入内容'" :placeholder="english ? 'Search content' : '搜索内容'">
      <template #leading><QuireIcon name="search" /></template>
    </QuireInput>
  </div>
  <QuireToolbar v-if="entries.length && !query.trim()" class="qk-block-insert-shortcuts"
    :label="english ? 'Text and lists' : '正文与列表'" align="start" overflow="visible" preserve-focus data-block-insert-types>
    <div class="qk-block-insert-shortcut-grid">
      <QuireToolbarAction v-for="entry in entries" :key="entry.value" :label="entry.label" :disabled="entry.disabled ?? false"
        v-bind="entry.icon ? {} : { text: entry.label }" @activate="insert(entry.value)">
        <template v-if="entry.icon" #default><QuireIcon :name="entry.icon" /></template>
      </QuireToolbarAction>
    </div>
  </QuireToolbar>
  <template v-else>
    <QuireMenuItem v-for="entry in entries" :key="entry.value" :value="entry.value" :disabled="entry.disabled ?? false" :close-on-select="false" @select="insert(entry.value)">
      <template #leading><QuireIcon :name="entry.icon" /></template>{{ entry.label }}
    </QuireMenuItem>
  </template>
  <QuireMenuSeparator v-if="entries.length && groups.length" />
  <QuireMenuGroup v-for="group in groups" :key="group.id" :label="group.label">
    <template v-for="item in group.items" :key="item.definition.id">
      <Picker v-if="definition(item.definition.id)?.toolbar" :definition="definition(item.definition.id)!" :model="model"
        :label="item.label" :color="color(definition(item.definition.id)!)" :disabled="busy || !item.canExecute" :parent-id="parentId" :portal-target="portalTarget" />
      <QuireMenuItem v-else :value="item.definition.id" :disabled="busy || !item.canExecute" :close-on-select="false" @select="insert(item.definition.id)">
        <template #leading><QuireIcon :name="item.definition.action.icon" :style="{ color: color(definition(item.definition.id)!) }" /></template>{{ item.label }}
      </QuireMenuItem>
    </template>
  </QuireMenuGroup>
  <p v-if="!entries.length && !groups.length" class="qk-block-insert-feedback" role="status">{{ english ? 'No matching content' : '没有匹配的内容' }}</p>
</template>

<style>
.qk-block-insert-search { padding: var(--qk-space-inline-tight); }
.qk-block-insert-shortcuts { --qk-toolbar-surface: transparent; display: flex; inline-size: 100%; box-sizing: border-box; padding: var(--qk-space-inline-tight); }
.qk-block-insert-shortcut-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--qk-space-inline-tight); justify-items: center; inline-size: 100%; }
.qk-block-insert-feedback { margin: 0; padding: var(--qk-space-inline); color: var(--qk-color-text-secondary); font-size: var(--qk-type-helper-font-size); }
</style>
