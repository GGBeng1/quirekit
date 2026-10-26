<script setup lang="ts">
import { QuireFileIcon, QuireIcon, QuireMenu, QuireMenuItems, QuireToolbarDisclosure,
  type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";

const props = defineProps<{
  /** Public toolbar state, file actions and execution bridge. */
  scope: QuireKitToolbarRendererScope;
}>();
const filenames: Readonly<Record<string, string>> = {
  markdown: "document.md", wordImport: "document.docx",
  export: "document.md", exportReview: "document.md", wordExport: "document.docx",
};
/** @param value - Menu action. @returns File name whose extension selects the icon; exporter ids name their extension. */
const filename = (value: string): string => filenames[value] ?? `document.${value.replace(/^export:/u, "")}`;

/** @param value - File action accepted by the public menu. */
function select(value: string): void {
  props.scope.execute(value);
  props.scope.setExpanded(false);
}
</script>

<template>
  <QuireMenu v-bind="scope.item.overlayProps" :open="scope.expanded" :aria-label="scope.item.label"
    @update:open="scope.setExpanded($event === true)">
    <template #trigger>
      <QuireToolbarDisclosure :toggle-on-click="false" :label="scope.item.label" :indicator="false" popup="menu"
        :expanded="scope.expanded" :disabled="scope.disabled" @update:expanded="scope.setExpanded">
        <QuireIcon :name="scope.item.icon" />
      </QuireToolbarDisclosure>
    </template>
    <QuireMenuItems v-for="group in scope.item.items ?? []" :key="group.value" :items="[group]" @select="select">
      <template v-if="group.value === 'imports' || group.value === 'exports'" #leading="{ item }">
        <QuireFileIcon :name="filename(item.value)" :size="16" :class="{ 'opacity-50': item.disabled }" />
      </template>
    </QuireMenuItems>
  </QuireMenu>
</template>
