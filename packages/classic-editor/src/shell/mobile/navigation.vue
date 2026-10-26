<script setup lang="ts">
import { computed, toRef } from "vue";
import { QuireIconProvider, QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicEditorRibbonTabContribution } from "../../types";
import { classicEditorIconRegistry } from "../../icons";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";

const props = defineProps<{
  /** Same command owner used by the desktop shell. */
  model: ClassicEditorShellModel;
  /** Capability-filtered task declarations. */
  tabs: readonly ClassicEditorRibbonTabContribution[];
  /** Current task, including contextual tasks. */
  activeTab: string | undefined;
  /** Whether the bottom command surface is expanded. */
  open: boolean;
}>();
const emit = defineEmits<{
  /** Selects an existing command task without creating another command runtime. */
  select: [id: string];
  /** Collapses the bottom surface. */
  close: [];
}>();
const { text, locale } = useClassicEditorShellContributions(toRef(props, "model"));
/** @param zh - Chinese label. @param en - English label. @returns Current interface label. */
function label(zh: string, en: string): string { return locale.value.startsWith("en") ? en : zh; }
const items = computed((): readonly QuireKitToolbarEntry[] => [
  { value: "keyboard", label: label("编辑正文", "Edit text"), icon: "keyboard", disabled: !props.model.context?.editor.isEditable },
  ...props.tabs.slice(0, 2).map(tab => ({ value: `task:${tab.id}`, label: text(tab.label), text: text(tab.label), kind: "disclosure" as const,
    popup: false as const, expanded: props.open && props.activeTab === tab.id })),
  { value: "outline", label: label("目录", "Outline"), icon: "listTree", kind: "disclosure", popup: false as const, expanded: props.model.context?.ui.state.leftSidebar.visible ?? false },
  { value: "tasks", label: label("更多工具", "More tools"), icon: "moreHorizontal", kind: "menu", trigger: "disclosure", items: props.tabs.slice(2).map(tab => ({ value: `task:${tab.id}`, label: text(tab.label) })) },
  ...(props.open ? [{ value: "close", label: label("收起工具", "Close tools"), icon: "chevronDown" }] : [])
]);
/** @param value - Existing task or shell action chosen through the public Toolbar. */
function execute(value: string): void {
  const context = props.model.context;
  if (value.startsWith("task:")) emit("select", value.slice(5));
  else if (value === "outline") { emit("close"); context?.ui.toggleSidebar("left"); }
  else if (value === "close") emit("close");
  else if (value === "keyboard") { emit("close"); context?.ui.closeSidebar("left"); context?.ui.closeSidebar("right"); context?.editor.view.focus(); }
}
</script>
<template>
  <div class="qk-classic-editor__mobile-navigation">
    <QuireIconProvider :registry="classicEditorIconRegistry">
      <QuireToolbar mode="mobile" variant="plain" :label="label('文档工具', 'Document tools')" :items="items" @select="execute" />
    </QuireIconProvider>
  </div>
</template>
