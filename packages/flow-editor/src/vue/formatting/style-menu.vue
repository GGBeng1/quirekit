<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, watch } from "vue";
import { QuireIcon, QuireMenu, QuireMenuItems, QuireMenuSubmenu, QuireMenuRadioGroup, QuireMenuRadioItem, QuireMenuSeparator, QuireToolbarDisclosure, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { localizeFlowEntries } from "../../locale/projection";
import { flowStyleGroups } from "../../ui/formatting/options";
import { flowEdgeEditItems } from "../../ui/toolbar/edge-edit";
import type { FlowStyleGroup, FlowStyleOption } from "../../ui/formatting/types";
import type { FlowFormattingContext } from "./types";
import StylePreview from "./style-preview.vue";

const { t, locale } = useFlowMessages();
const props = defineProps<{
  /** Public toolbar control and current neutral state. */
  scope: QuireKitToolbarRendererScope;
}>();
const context = computed(() => props.scope.context as FlowFormattingContext);
const groups = computed(() => {
  const style = context.value.state.selectedStyle;
  const line = flowStyleGroups("line", style), arrows = flowStyleGroups("arrows", style);
  return [...line.filter(group => group.value !== "crossing"), ...arrows, ...line.filter(group => group.value === "crossing")];
});
const edgeItems = computed(() => localizeFlowEntries(flowEdgeEditItems(), locale.value));
/** @param group - Current selection projection. @returns A truthful preview or undefined for mixed/custom settings. */
function currentOption(group: FlowStyleGroup): FlowStyleOption | undefined { return group.options.find(option => option.value === group.selected); }
const selection = computed(() => JSON.stringify(context.value.state.selectedIds));
let owner: { editor: FlowFormattingContext["editor"]; selection: string } | undefined;
/** @param open - Public menu transition; keep the owner through its synchronous selection/close events. */
function setOpen(open: boolean): void {
  if (open) owner = { editor: context.value.editor, selection: selection.value };
  props.scope.setExpanded(open);
}
/** @param value - Selected menu option; late events cannot target a different selection or instance. */
function select(value: string): void {
  if (!owner || props.scope.disabled || owner.editor !== context.value.editor || owner.selection !== selection.value) return;
  props.scope.execute(value);
  props.scope.setExpanded(false);
}
watch([() => context.value.editor, selection, () => props.scope.disabled], () => {
  owner = undefined; props.scope.setExpanded(false);
}, { flush: "sync" });
</script>

<template>
  <QuireMenu :open="scope.expanded" :aria-label="scope.item.label" :width="256" @update:open="setOpen(!!$event)">
    <template #trigger>
      <QuireToolbarDisclosure :label="scope.item.label" v-bind="scope.item.text === undefined ? {} : { text: scope.item.text }" :disabled="scope.disabled" :expanded="scope.expanded" :toggle-on-click="false" indicator @update:expanded="setOpen">
        <QuireIcon :name="scope.item.icon" />
      </QuireToolbarDisclosure>
    </template>
    <QuireMenuSubmenu v-for="group in groups" :key="group.value" width="280px" @select="select">
      <template #trigger>
        <span class="qk-flow-line-menu__group"><span>{{ group.value === 'crossing' ? t('交叉处理') : t(group.label) }}</span>
          <StylePreview v-if="currentOption(group)" :option="currentOption(group)!" />
          <span v-else class="qk-flow-line-menu__mixed" aria-hidden="true">—</span>
        </span>
      </template>
      <QuireMenuRadioGroup :model-value="group.selected" :label="t(group.label)">
        <QuireMenuRadioItem v-for="option in group.options" :key="option.value" :value="option.value" :disabled="scope.disabled" close-on-select>
          {{ t(option.label) }}
          <template #trailing><StylePreview :option="option" /></template>
        </QuireMenuRadioItem>
      </QuireMenuRadioGroup>
    </QuireMenuSubmenu>
    <QuireMenuSeparator />
    <QuireMenuItems :items="edgeItems" @select="select" />
  </QuireMenu>
</template>

<style scoped>
.qk-flow-line-menu__group { display: flex; align-items: center; justify-content: space-between; gap: var(--qk-space-inline); }
.qk-flow-line-menu__mixed { width: 80px; text-align: center; color: var(--qk-color-text-tertiary); }
</style>
